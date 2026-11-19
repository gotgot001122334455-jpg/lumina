import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Activity, CreditCard, MessageSquare, ExternalLink, MessageCircle, Settings } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { openSmartsuppChat } from '@/lib/smartsupp';

export default function AdminOverview() {
  const [walletEmail, setWalletEmail] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [creditCurrency, setCreditCurrency] = useState('USD');
  const [stats, setStats] = useState<{ totalUsers: number, pendingTransactions: number, balances: { currency: string, balance: number }[] }>({ totalUsers: 0, pendingTransactions: 0, balances: [] });
  const [isLoading, setIsLoading] = useState(false);

  // Smartsupp Quick Config State
  const [smartsuppKey, setSmartsuppKey] = useState('');
  const [smartsuppEnabled, setSmartsuppEnabled] = useState(true);
  const [isSavingSmartsupp, setIsSavingSmartsupp] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [statsRes, settingsRes] = await Promise.all([
          api.get('/admin/overview'),
          api.get('/admin/settings'),
        ]);
        if (!ignore) {
          if (statsRes.data) setStats(statsRes.data);
          if (settingsRes.data) {
            setSmartsuppKey(settingsRes.data.SMARTSUPP_KEY || '');
            setSmartsuppEnabled(settingsRes.data.SMARTSUPP_ENABLED !== 'false');
          }
        }
      } catch (error) {
        console.error('Failed to load admin overview:', error);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  const refreshStats = async () => {
    try {
      const response = await api.get('/admin/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  const handleSaveSmartsupp = async () => {
    setIsSavingSmartsupp(true);
    try {
      await api.post('/admin/settings', {
        SMARTSUPP_KEY: smartsuppKey.trim(),
        SMARTSUPP_ENABLED: smartsuppEnabled ? 'true' : 'false'
      });
      toast.success('Smartsupp key updated successfully!');
      window.dispatchEvent(new CustomEvent('smartsupp:reload'));
    } catch {
      toast.error('Failed to update Smartsupp key');
    } finally {
      setIsSavingSmartsupp(false);
    }
  };

  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletEmail || !walletAmount) return;
    
    setIsLoading(true);
    try {
      await api.post('/admin/credit-wallet', {
        identifier: walletEmail,
        amount: parseFloat(walletAmount),
        currency: creditCurrency
      });
      toast.success(`Successfully credited ${creditCurrency} ${walletAmount} to ${walletEmail}`);
      setWalletEmail('');
      setWalletAmount('');
      refreshStats();
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) && error.response?.data?.error
        ? String(error.response.data.error)
        : 'Failed to credit wallet';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSmartsuppActive = smartsuppEnabled && Boolean(smartsuppKey.trim());

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
          <p className="text-lumina-text-secondary mt-1">System overview and quick management actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/adminxyz/settings">
            <Button variant="outline" className="border-lumina-border text-white hover:bg-lumina-surface-light flex items-center gap-2">
              <Settings size={16} />
              Full System Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-lumina-surface border-lumina-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-lumina-text-secondary">Total Users</p>
              <h2 className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-lumina-surface border-lumina-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-lumina-text-secondary">Pending Transactions</p>
              <h2 className="text-2xl font-bold text-white">{stats.pendingTransactions.toLocaleString()}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-lumina-surface border-lumina-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-lumina-text-secondary mb-2">User Balances</p>
              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-2 scrollbar-hide">
                {stats.balances.length === 0 ? (
                  <h2 className="text-2xl font-bold text-white">$0.00</h2>
                ) : (
                  stats.balances.map(b => (
                    <div key={b.currency} className="flex justify-between items-center text-sm font-mono text-white">
                      <span>{b.currency}</span>
                      <span>{b.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prominent Smartsupp Live Chat Quick Management Card */}
      <Card className="bg-lumina-surface border-lumina-border border-orange-500/30 shadow-lg shadow-orange-500/5">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Smartsupp Live Chat Integration</CardTitle>
                <CardDescription className="text-lumina-text-secondary">
                  Configure and manage your live chat widget key directly from this dashboard.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="smartsupp-key-input" className="text-lumina-text-secondary font-medium">
                Smartsupp API / Project Key
              </Label>
              <Input
                id="smartsupp-key-input"
                type="text"
                value={smartsuppKey}
                onChange={(e) => setSmartsuppKey(e.target.value)}
                placeholder="e.g. a29b1125935b9e4e98019434f0cfae05fa0ee5e8"
                className="bg-lumina-bg border-lumina-border text-white font-mono"
              />
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <Button
                onClick={handleSaveSmartsupp}
                disabled={isSavingSmartsupp}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold flex-1 sm:flex-none"
              >
                {isSavingSmartsupp ? 'Saving...' : 'Save Smartsupp Key'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openSmartsuppChat}
                className="border-lumina-border text-white hover:bg-lumina-surface-light flex items-center gap-1.5"
                title="Test Chat Widget"
              >
                <MessageCircle size={16} className="text-orange-400" />
                Test Chat
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-lumina-text-secondary pt-2 border-t border-lumina-border/50 gap-2">
            <p>
              Get your key from <a href="https://app.smartsupp.com" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline inline-flex items-center gap-0.5 font-medium">Smartsupp Dashboard <ExternalLink size={11} /></a> &rarr; Settings &rarr; Chat box &rarr; Chat code.
            </p>
            <Link to="/adminxyz/settings" className="text-indigo-400 hover:underline font-medium shrink-0">
              Go to Full Admin Settings &rarr;
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Action: Credit Wallet */}
        <Card className="bg-lumina-surface border-lumina-border">
          <CardHeader>
            <CardTitle className="text-lg text-white">Credit User Wallet</CardTitle>
            <CardDescription className="text-lumina-text-secondary">Manually add funds to a user's account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreditWallet} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-lumina-text-secondary">User Email or ID</Label>
                <Input 
                  id="email" 
                  type="email" 
                  required
                  placeholder="user@example.com"
                  value={walletEmail}
                  onChange={(e) => setWalletEmail(e.target.value)}
                  className="bg-lumina-bg border-lumina-border text-white focus-visible:ring-red-500" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-lumina-text-secondary">Amount</Label>
                <div className="flex gap-2">
                  <Input 
                    id="amount" 
                    type="number" 
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="100.00"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="bg-lumina-bg border-lumina-border text-white focus-visible:ring-red-500 flex-1" 
                  />
                  <Select value={creditCurrency} onValueChange={setCreditCurrency}>
                    <SelectTrigger className="w-[100px] bg-lumina-bg border-lumina-border text-white">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-lumina-surface border-lumina-border text-white">
                      {['USD', 'EUR', 'GBP', 'NGN'].map(c => (
                        <SelectItem key={c} value={c} className="focus:bg-lumina-surface-light focus:text-white cursor-pointer">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="mt-2 bg-red-500 hover:bg-red-600 text-white font-semibold">
                {isLoading ? 'Crediting...' : 'Credit Wallet'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Action: Alerts */}
        <Card className="bg-lumina-surface border-lumina-border">
          <CardHeader>
            <CardTitle className="text-lg text-white">System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="bg-lumina-bg border border-lumina-border p-4 rounded-xl flex gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Pending Approvals</p>
                  <p className="text-xs text-lumina-text-secondary mt-1">You have {stats.pendingTransactions} pending transaction(s) requiring admin review.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
