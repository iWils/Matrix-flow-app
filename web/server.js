const { createServer } = require('http')
const { createServer: createHttpsServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)
const httpsPort = parseInt(process.env.HTTPS_PORT || '443', 10)
const enableHttps = process.env.ENABLE_HTTPS === 'true'

// Configuration SSL
const sslOptions = {
  key: null,
  cert: null
}

// Chemins possibles pour les certificats SSL
const sslPaths = [
  // Certificats personnalisés
  {
    key: '/app/ssl/privkey.pem',
    cert: '/app/ssl/fullchain.pem'
  },
  {
    key: '/app/ssl/key.pem', 
    cert: '/app/ssl/cert.pem'
  },
  // Certificats Let's Encrypt
  {
    key: '/etc/letsencrypt/live/domain/privkey.pem',
    cert: '/etc/letsencrypt/live/domain/fullchain.pem'
  },
  // Certificats acme.sh (support multi-CA)
  {
    key: '/root/.acme.sh/domain/domain.key',
    cert: '/root/.acme.sh/domain/fullchain.cer'
  },
  // Certificats ZeroSSL
  {
    key: '/etc/ssl/zerossl/private.key',
    cert: '/etc/ssl/zerossl/certificate.crt'
  },
  // Certificats Buypass
  {
    key: '/etc/ssl/buypass/private.key', 
    cert: '/etc/ssl/buypass/certificate.crt'
  },
  // Certificats de développement
  {
    key: './ssl/localhost-key.pem',
    cert: './ssl/localhost-cert.pem'
  }
]

function loadSSLCertificates() {
  for (const sslPath of sslPaths) {
    try {
      if (fs.existsSync(sslPath.key) && fs.existsSync(sslPath.cert)) {
        sslOptions.key = fs.readFileSync(sslPath.key)
        sslOptions.cert = fs.readFileSync(sslPath.cert)
        console.log(`✅ Certificats SSL chargés depuis: ${sslPath.key}`)
        return true
      }
    } catch (error) {
      console.warn(`⚠️  Impossible de charger les certificats depuis ${sslPath.key}:`, error.message)
    }
  }
  return false
}

function generateSelfSignedCert() {
  const { execSync } = require('child_process')
  
  try {
    console.log('🔧 Génération de certificats auto-signés...')
    
    // Créer le répertoire SSL s'il n'existe pas
    const sslDir = '/app/ssl'
    if (!fs.existsSync(sslDir)) {
      fs.mkdirSync(sslDir, { recursive: true })
    }
    
    // Générer les certificats
    execSync(`openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ${sslDir}/key.pem \
      -out ${sslDir}/cert.pem \
      -subj "/C=FR/ST=IDF/L=Paris/O=MatrixFlow/CN=${hostname}"`, 
      { stdio: 'inherit' }
    )
    
    // Charger les certificats générés
    sslOptions.key = fs.readFileSync(`${sslDir}/key.pem`)
    sslOptions.cert = fs.readFileSync(`${sslDir}/cert.pem`)
    
    console.log('✅ Certificats auto-signés générés et chargés')
    return true
  } catch (error) {
    console.error('❌ Impossible de générer les certificats auto-signés:', error.message)
    return false
  }
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Serveur HTTP (toujours actif)
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      
      // Redirection HTTPS si activée et pas déjà en HTTPS
      if (enableHttps && !req.connection.encrypted && process.env.FORCE_HTTPS !== 'false') {
        const httpsUrl = `https://${req.headers.host?.replace(`:${port}`, httpsPort === 443 ? '' : `:${httpsPort}`)}${req.url}`
        res.writeHead(301, { Location: httpsUrl })
        res.end()
        return
      }
      
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  httpServer.listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 Serveur HTTP prêt sur http://${hostname}:${port}`)
  })

  // Serveur HTTPS (si activé)
  if (enableHttps) {
    let sslLoaded = loadSSLCertificates()
    
    // Si aucun certificat trouvé et en mode développement, générer des certificats auto-signés
    if (!sslLoaded && (dev || process.env.GENERATE_SELF_SIGNED === 'true')) {
      sslLoaded = generateSelfSignedCert()
    }
    
    if (sslLoaded) {
      const httpsServer = createHttpsServer(sslOptions, async (req, res) => {
        try {
          const parsedUrl = parse(req.url, true)
          await handle(req, res, parsedUrl)
        } catch (err) {
          console.error('Error occurred handling', req.url, err)
          res.statusCode = 500
          res.end('internal server error')
        }
      })

      httpsServer.listen(httpsPort, (err) => {
        if (err) throw err
        console.log(`🔒 Serveur HTTPS prêt sur https://${hostname}:${httpsPort}`)
      })
    } else {
      console.warn('⚠️  HTTPS activé mais aucun certificat SSL disponible')
      console.warn('⚠️  L\'application fonctionne uniquement en HTTP')
    }
  }
})