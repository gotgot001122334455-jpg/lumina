import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Eye, EyeOff, ExternalLink, CheckCircle2, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { openSmartsuppChat } from '@/lib/smartsupp';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    MAINTENANCE_MODE: 'false',
    REQUIRE_MANUAL_APPROVAL: 'false',
    NEW_USER_REGISTRATION: 'true',
    EMAIL_PROVIDER: 'SMTP',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_SECURE: 'false',
    BREVO_API_KEY: '',
    SMTP_FROM: '',
    SMARTSUPP_KEY: '',
    SMARTSUPP_ENABLED: 'true',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSmartsuppKey, setShowSmartsuppKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchSettings() {
      try {
        const res = await api.get('/admin/settings');
        if (!ignore && res.data) {
          setSettings(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          toast.error('Failed to load settings');
        }
      }
    }

    fetchSettings();

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async (payloadToSave?: Record<string, string>) => {
    setIsLoading(true);
    const toSave = payloadToSave || settings;
    try {
      await api.post('/admin/settings', toSave);
      toast.success('Settings saved successfully');
      // Trigger live widget reload
      window.dispatchEvent(new CustomEvent('smartsupp:reload'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleFlag = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));
  };

  const handleCopyKey = () => {
    if (!settings.SMARTSUPP_KEY) return;
    navigator.clipboard.writeText(settings.SMARTSUPP_KEY);
    setCopiedKey(true);
    toast.success('Smartsupp key copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleTestChat = () => {
    if (settings.SMARTSUPP_ENABLED === 'false') {
      toast.info('Smartsupp is currently toggled OFF. Enable it first.');
      return;
    }
    if (!settings.SMARTSUPP_KEY) {
      toast.error('Please enter a Smartsupp API key first.');
      return;
    }
    openSmartsuppChat();
    toast.success('Opening Smartsupp chat box...');
  };

  const isSmartsuppActive = settings.SMARTSUPP_ENABLED !== 'false' && Boolean(settings.SMARTSUPP_KEY?.trim());

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Settings</h1>
          <p className="text-lumina-text-secondary mt-1">Configure live chat, global flags, and email services.</p>
        </div>
        <Button 
          onClick={() => handleSave()} 
          disabled={isLoading} 
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold self-start sm:self-auto"
        >
          {isLoading ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Smartsupp Live Chat Configuration - Positioned prominently at top */}
        <Card id="smartsupp-card" className="bg-lumina-surface border-lumina-border border-orange-500/30 shadow-md">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Smartsupp Live Chat</CardTitle>
                  <CardDescription className="text-lumina-text-secondary">
                    Configure live customer support chat for public visitors and logged-in users.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {isSmartsuppActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live & Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Disabled / Unset
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle Enable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Enable Live Chat Widget</p>
                <p className="text-sm text-lumina-text-secondary mt-1">
                  Render the Smartsupp chat bubble on landing pages and customer dashboard.
                </p>
              </div>
              <div 
                onClick={() => toggleFlag('SMARTSUPP_ENABLED')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.SMARTSUPP_ENABLED !== 'false' ? 'bg-orange-500' : 'bg-lumina-surface-light border border-lumina-border'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.SMARTSUPP_ENABLED !== 'false' ? 'right-0.5' : 'left-0.5 bg-lumina-text-tertiary'}`}></div>
              </div>
            </div>

            {/* Smartsupp API Key Input */}
            <div className="space-y-2 border-t border-lumina-border/50 pt-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="smartsupp-key" className="text-lumina-text-secondary font-medium">
                  Smartsupp API / Project Key
                </Label>
                {settings.SMARTSUPP_KEY && (
                  <span className="text-xs text-lumina-text-tertiary font-mono">
                    {settings.SMARTSUPP_KEY.length} characters
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <Input
                  id="smartsupp-key"
                  type={showSmartsuppKey ? 'text' : 'password'}
                  value={settings.SMARTSUPP_KEY || ''}
                  onChange={(e) => handleChange('SMARTSUPP_KEY', e.target.value)}
                  placeholder="e.g. a29b1125935b9e4e98019434f0cfae05fa0ee5e8"
                  className="bg-lumina-bg border-lumina-border text-white font-mono pr-20"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSmartsuppKey(!showSmartsuppKey)}
                    className="p-1.5 text-lumina-text-tertiary hover:text-white transition-colors"
                    title={showSmartsuppKey ? 'Hide key' : 'Show key'}
                  >
                    {showSmartsuppKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {settings.SMARTSUPP_KEY && (
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-1.5 text-lumina-text-tertiary hover:text-white transition-colors"
                      title="Copy key"
                    >
                      {copiedKey ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Instructions Box */}
              <div className="bg-lumina-bg/60 border border-lumina-border/60 rounded-lg p-4 mt-3 text-xs text-lumina-text-secondary space-y-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <CheckCircle2 size={15} className="text-orange-400" />
                  <span>How to get your Smartsupp Key</span>
                </div>
                <p className="leading-relaxed">
                  1. Log in to your Smartsupp account at{' '}
                  <a 
                    href="https://app.smartsupp.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-orange-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    app.smartsupp.com <ExternalLink size={12} />
                  </a>
                </p>
                <p className="leading-relaxed">
                  2. Navigate to <strong>Settings</strong> &rarr; <strong>Chat box</strong> &rarr; <strong>Chat code</strong>.
                </p>
                <p className="leading-relaxed">
                  3. Copy your project key from <code className="bg-lumina-surface px-1.5 py-0.5 rounded text-orange-300 font-mono">_smartsupp.key = &apos;YOUR_KEY&apos;;</code> and paste it above.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={() => handleSave()}
                disabled={isLoading}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                {isLoading ? 'Saving...' : 'Save Smartsupp Settings'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestChat}
                className="border-lumina-border text-white hover:bg-lumina-surface-light flex items-center gap-2"
              >
                <MessageCircle size={16} className="text-orange-400" />
                Test Chat Widget
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Global System Flags */}
        <Card className="bg-lumina-surface border-lumina-border">
          <CardHeader>
            <CardTitle className="text-lg text-white">Global System Flags</CardTitle>
            <CardDescription className="text-lumina-text-secondary">Toggle core system functionalities on or off.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Maintenance Mode</p>
                <p className="text-sm text-lumina-text-secondary mt-1">Disable user logins and transactions temporarily.</p>
              </div>
              <div 
                onClick={() => toggleFlag('MAINTENANCE_MODE')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.MAINTENANCE_MODE === 'true' ? 'bg-red-500' : 'bg-lumina-surface-light border border-lumina-border'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.MAINTENANCE_MODE === 'true' ? 'right-0.5' : 'left-0.5 bg-lumina-text-tertiary'}`}></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-lumina-border/50 pt-6">
              <div>
                <p className="font-medium text-white">Require Manual Approval for Large Transfers</p>
                <p className="text-sm text-lumina-text-secondary mt-1">Transactions over $10,000 will be flagged automatically.</p>
              </div>
              <div 
                onClick={() => toggleFlag('REQUIRE_MANUAL_APPROVAL')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.REQUIRE_MANUAL_APPROVAL === 'true' ? 'bg-indigo-500' : 'bg-lumina-surface-light border border-lumina-border'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.REQUIRE_MANUAL_APPROVAL === 'true' ? 'right-0.5' : 'left-0.5 bg-lumina-text-tertiary'}`}></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-lumina-border/50 pt-6">
              <div>
                <p className="font-medium text-white">New User Registration</p>
                <p className="text-sm text-lumina-text-secondary mt-1">Allow new users to sign up via the public site.</p>
              </div>
              <div 
                onClick={() => toggleFlag('NEW_USER_REGISTRATION')}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.NEW_USER_REGISTRATION === 'true' ? 'bg-green-500' : 'bg-lumina-surface-light border border-lumina-border'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${settings.NEW_USER_REGISTRATION === 'true' ? 'right-0.5' : 'left-0.5 bg-lumina-text-tertiary'}`}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card className="bg-lumina-surface border-lumina-border">
          <CardHeader>
            <CardTitle className="text-lg text-white">Email Configuration</CardTitle>
            <CardDescription className="text-lumina-text-secondary">Configure SMTP or Brevo API for transactional emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label className="text-lumina-text-secondary">Email Provider</Label>
              <Select value={settings.EMAIL_PROVIDER} onValueChange={(val) => handleChange('EMAIL_PROVIDER', val)}>
                <SelectTrigger className="w-full bg-lumina-bg border-lumina-border text-white">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent className="bg-lumina-surface border-lumina-border text-white">
                  <SelectItem value="SMTP" className="focus:bg-lumina-surface-light focus:text-white cursor-pointer">Standard SMTP</SelectItem>
                  <SelectItem value="BREVO" className="focus:bg-lumina-surface-light focus:text-white cursor-pointer">Brevo HTTP API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-lumina-text-secondary">Sender Email Address (From)</Label>
              <Input 
                type="email" 
                value={settings.SMTP_FROM || ''} 
                onChange={(e) => handleChange('SMTP_FROM', e.target.value)}
                placeholder="noreply@luminabank.com"
                className="bg-lumina-bg border-lumina-border text-white" 
              />
            </div>

            {settings.EMAIL_PROVIDER === 'BREVO' ? (
              <div className="space-y-2 pt-2">
                <Label className="text-lumina-text-secondary">Brevo API Key (v3)</Label>
                <Input 
                  type="password" 
                  value={settings.BREVO_API_KEY || ''} 
                  onChange={(e) => handleChange('BREVO_API_KEY', e.target.value)}
                  placeholder="xkeysib-..."
                  className="bg-lumina-bg border-lumina-border text-white font-mono" 
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-lumina-text-secondary">SMTP Host</Label>
                  <Input 
                    value={settings.SMTP_HOST || ''} 
                    onChange={(e) => handleChange('SMTP_HOST', e.target.value)}
                    placeholder="smtp.mailtrap.io"
                    className="bg-lumina-bg border-lumina-border text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-lumina-text-secondary">SMTP Port</Label>
                  <Input 
                    type="number"
                    value={settings.SMTP_PORT || '587'} 
                    onChange={(e) => handleChange('SMTP_PORT', e.target.value)}
                    placeholder="587"
                    className="bg-lumina-bg border-lumina-border text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-lumina-text-secondary">SMTP User</Label>
                  <Input 
                    value={settings.SMTP_USER || ''} 
                    onChange={(e) => handleChange('SMTP_USER', e.target.value)}
                    className="bg-lumina-bg border-lumina-border text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-lumina-text-secondary">SMTP Password</Label>
                  <Input 
                    type="password" 
                    value={settings.SMTP_PASS || ''} 
                    onChange={(e) => handleChange('SMTP_PASS', e.target.value)}
                    className="bg-lumina-bg border-lumina-border text-white" 
                  />
                </div>
              </div>
            )}

            <Button onClick={() => handleSave()} disabled={isLoading} className="mt-6 w-full md:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">
              {isLoading ? 'Saving...' : 'Save Email Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
