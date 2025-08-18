'use client'
import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'

type AuthProvider = {
  id: number
  name: string
  type: 'ldap' | 'oidc' | 'saml'
  config: any
  isActive: boolean
  priority: number
}

type LDAPConfig = {
  server: string
  port: number
  bindDN: string
  bindPassword: string
  searchBase: string
  searchFilter: string
  useTLS: boolean
  userAttributes: {
    username: string
    email: string
    fullName: string
  }
}

type OIDCConfig = {
  issuer: string
  clientId: string
  clientSecret: string
  scopes: string[]
  usernameClaim: string
  emailClaim: string
  fullNameClaim: string
}

export default function AuthConfigPage() {
  const { data: session } = useSession()
  const [providers, setProviders] = useState<AuthProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ldap' | 'oidc'>('ldap')
  const [ldapConfig, setLdapConfig] = useState<LDAPConfig>({
    server: '',
    port: 389,
    bindDN: '',
    bindPassword: '',
    searchBase: '',
    searchFilter: '(uid={username})',
    useTLS: false,
    userAttributes: {
      username: 'uid',
      email: 'mail',
      fullName: 'cn'
    }
  })
  const [oidcConfig, setOidcConfig] = useState<OIDCConfig>({
    issuer: '',
    clientId: '',
    clientSecret: '',
    scopes: ['openid', 'profile', 'email'],
    usernameClaim: 'preferred_username',
    emailClaim: 'email',
    fullNameClaim: 'name'
  })

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadAuthProviders()
    }
  }, [session])

  async function loadAuthProviders() {
    try {
      const res = await fetch('/api/admin/auth/providers')
      if (res.ok) {
        const response = await res.json()
        if (response.success && response.data) {
          setProviders(response.data)
          
          // Charger les configurations existantes
          const ldapProvider = response.data.find((p: AuthProvider) => p.type === 'ldap')
          if (ldapProvider) {
            setLdapConfig(ldapProvider.config)
          }
          
          const oidcProvider = response.data.find((p: AuthProvider) => p.type === 'oidc')
          if (oidcProvider) {
            setOidcConfig(oidcProvider.config)
          }
        }
      }
    } catch (error) {
      console.error('Error loading auth providers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveLDAPConfig() {
    try {
      const res = await fetch('/api/admin/auth/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'LDAP/Active Directory',
          type: 'ldap',
          config: ldapConfig,
          isActive: true
        })
      })
      
      if (res.ok) {
        alert('Configuration LDAP sauvegardée')
        loadAuthProviders()
      }
    } catch (error) {
      console.error('Error saving LDAP config:', error)
    }
  }

  async function saveOIDCConfig() {
    try {
      const res = await fetch('/api/admin/auth/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'OIDC Provider',
          type: 'oidc',
          config: oidcConfig,
          isActive: true
        })
      })
      
      if (res.ok) {
        alert('Configuration OIDC sauvegardée')
        loadAuthProviders()
      }
    } catch (error) {
      console.error('Error saving OIDC config:', error)
    }
  }

  async function testConnection(type: 'ldap' | 'oidc') {
    try {
      const config = type === 'ldap' ? ldapConfig : oidcConfig
      const res = await fetch(`/api/admin/auth/test/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const result = await res.json()
      if (res.ok) {
        alert('Test de connexion réussi !')
      } else {
        alert(`Erreur de connexion: ${result.error}`)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      alert('Erreur lors du test de connexion')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configuration Authentification</h1>
        <p className="text-slate-300">
          Intégration avec Active Directory, LDAP et fournisseurs OIDC
        </p>
      </div>

      {/* Providers Status */}
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Fournisseurs d'authentification</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map(provider => (
              <div key={provider.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-white">{provider.name}</h4>
                  <p className="text-xs text-slate-400 uppercase">{provider.type}</p>
                </div>
                <Badge variant={provider.isActive ? 'success' : 'error'}>
                  {provider.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            ))}
            {providers.length === 0 && (
              <div className="col-span-3 text-center py-4">
                <p className="text-sm text-slate-400">Aucun fournisseur configuré</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Configuration Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('ldap')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ldap'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              LDAP / Active Directory
            </button>
            <button
              onClick={() => setActiveTab('oidc')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'oidc'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              OIDC
            </button>
          </nav>
        </div>
      </div>

      {/* LDAP Configuration */}
      {activeTab === 'ldap' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Configuration LDAP/AD</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Serveur LDAP
                  </label>
                  <Input
                    value={ldapConfig.server}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      server: e.target.value
                    })}
                    placeholder="ldap://dc.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Port
                  </label>
                  <Input
                    type="number"
                    value={ldapConfig.port}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      port: parseInt(e.target.value) || 389
                    })}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useTLS"
                    checked={ldapConfig.useTLS}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      useTLS: e.target.checked
                    })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="useTLS" className="text-sm font-medium text-slate-200">
                    Utiliser TLS/SSL
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Bind DN
                  </label>
                  <Input
                    value={ldapConfig.bindDN}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      bindDN: e.target.value
                    })}
                    placeholder="cn=admin,dc=example,dc=com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Mot de passe Bind
                  </label>
                  <Input
                    type="password"
                    value={ldapConfig.bindPassword}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      bindPassword: e.target.value
                    })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Base de recherche
                  </label>
                  <Input
                    value={ldapConfig.searchBase}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      searchBase: e.target.value
                    })}
                    placeholder="ou=users,dc=example,dc=com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Filtre de recherche
                  </label>
                  <Input
                    value={ldapConfig.searchFilter}
                    onChange={(e) => setLdapConfig({
                      ...ldapConfig,
                      searchFilter: e.target.value
                    })}
                    placeholder="(uid={username})"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-slate-200 mb-3">Mapping des attributs</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nom d'utilisateur
                      </label>
                      <Input
                        value={ldapConfig.userAttributes.username}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          userAttributes: {
                            ...ldapConfig.userAttributes,
                            username: e.target.value
                          }
                        })}
                        placeholder="uid"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Email
                      </label>
                      <Input
                        value={ldapConfig.userAttributes.email}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          userAttributes: {
                            ...ldapConfig.userAttributes,
                            email: e.target.value
                          }
                        })}
                        placeholder="mail"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nom complet
                      </label>
                      <Input
                        value={ldapConfig.userAttributes.fullName}
                        onChange={(e) => setLdapConfig({
                          ...ldapConfig,
                          userAttributes: {
                            ...ldapConfig.userAttributes,
                            fullName: e.target.value
                          }
                        })}
                        placeholder="cn"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                onClick={() => testConnection('ldap')}
                variant="outline"
                disabled={!ldapConfig.server}
              >
                Tester la connexion
              </Button>
              <Button onClick={saveLDAPConfig}>
                Sauvegarder la configuration
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* OIDC Configuration */}
      {activeTab === 'oidc' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Configuration OIDC</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Issuer URL
                  </label>
                  <Input
                    value={oidcConfig.issuer}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      issuer: e.target.value
                    })}
                    placeholder="https://auth.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Client ID
                  </label>
                  <Input
                    value={oidcConfig.clientId}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      clientId: e.target.value
                    })}
                    placeholder="matrix-flow-client"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Client Secret
                  </label>
                  <Input
                    type="password"
                    value={oidcConfig.clientSecret}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      clientSecret: e.target.value
                    })}
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">
                    Scopes (séparés par des espaces)
                  </label>
                  <Input
                    value={oidcConfig.scopes.join(' ')}
                    onChange={(e) => setOidcConfig({
                      ...oidcConfig,
                      scopes: e.target.value.split(' ').filter(s => s.trim())
                    })}
                    placeholder="openid profile email"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-t lg:border-t-0 pt-4 lg:pt-0">
                  <h4 className="text-sm font-medium text-slate-200 mb-3">Mapping des claims</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nom d'utilisateur
                      </label>
                      <Input
                        value={oidcConfig.usernameClaim}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          usernameClaim: e.target.value
                        })}
                        placeholder="preferred_username"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Email
                      </label>
                      <Input
                        value={oidcConfig.emailClaim}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          emailClaim: e.target.value
                        })}
                        placeholder="email"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nom complet
                      </label>
                      <Input
                        value={oidcConfig.fullNameClaim}
                        onChange={(e) => setOidcConfig({
                          ...oidcConfig,
                          fullNameClaim: e.target.value
                        })}
                        placeholder="name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button
                onClick={() => testConnection('oidc')}
                variant="outline"
                disabled={!oidcConfig.issuer || !oidcConfig.clientId}
              >
                Tester la configuration
              </Button>
              <Button onClick={saveOIDCConfig}>
                Sauvegarder la configuration
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}