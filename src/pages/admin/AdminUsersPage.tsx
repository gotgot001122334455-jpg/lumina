import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Search, UserX, UserCheck, Shield, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const getFileUrl = (path: string) => {
  if (!path) return '';
  
  // Handle mock uploads with realistic Unsplash placeholders
  if (path.includes('/mock-uploads/')) {
    if (path.includes('front') || path.includes('elon')) {
      return 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=800&q=80'; // Mock ID
    }
    if (path.includes('back') || path.includes('davido')) {
      return 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80'; // Back document
    }
    if (path.includes('selfie') || path.includes('download')) {
      return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'; // Portrait/Selfie
    }
    if (path.includes('proof') || path.includes('speed')) {
      return 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80'; // Utility bill/Proof
    }
  }

  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return (api.defaults.baseURL?.replace('/api', '') || '') + path;
};

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'kyc'>('users');
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (activeTab === 'kyc') fetchKycRequests();
    else fetchUsers();
  }, [activeTab]);

  const fetchKycRequests = async () => {
    try {
      const res = await api.get('/admin/kyc/pending');
      setKycRequests(res.data.requests);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveKyc = async (id: string) => {
    try {
      await api.post(`/admin/kyc/${id}`, { status: 'APPROVED' });
      setKycRequests(kycRequests.filter(req => req.id !== id));
      alert('KYC approved successfully.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleDeclineKyc = async (id: string) => {
    try {
      await api.post(`/admin/kyc/${id}`, { status: 'REJECTED' });
      setKycRequests(kycRequests.filter(req => req.id !== id));
      alert('KYC rejected.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject');
    }
  };

  const handleToggleStatus = async (user: any) => {
    const newStatus = user.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.post(`/admin/users/${user.id}/status`, { status: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, accountStatus: newStatus } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const filteredKyc = kycRequests.filter(req => 
    req.user?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    req.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">User Management</h1>
          <p className="text-lumina-text-secondary mt-1">Manage user accounts, KYC, and statuses.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-lumina-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-2 text-sm font-semibold transition-colors relative ${activeTab === 'users' ? 'text-white' : 'text-lumina-text-secondary hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" /> All Users
          </div>
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className={`pb-4 px-2 text-sm font-semibold transition-colors relative ${activeTab === 'kyc' ? 'text-white' : 'text-lumina-text-secondary hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" /> Pending KYC
            {kycRequests.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {kycRequests.length}
              </span>
            )}
          </div>
          {activeTab === 'kyc' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
        </button>
      </div>

      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lumina-text-tertiary" />
        <Input 
          placeholder="Search by name or email..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-lumina-surface border-lumina-border focus-visible:ring-indigo-500 text-white h-10"
        />
      </div>

      <Card className="bg-lumina-surface border-lumina-border overflow-x-auto rounded-xl">
        {activeTab === 'users' ? (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-lumina-border bg-lumina-bg/50">
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">User</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">Balance</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">KYC Status</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">Account Status</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lumina-border/40">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-lumina-surface-light/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white">{user.fullName}</p>
                    <p className="text-sm text-lumina-text-tertiary">{user.email}</p>
                  </td>
                  <td className="p-4 text-white font-mono">
                    {user.wallets?.map((w: any) => (
                      <div key={w.currency} className="text-xs">
                        {w.currency} {w.balance.toFixed(2)}
                      </div>
                    ))}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
                      user.kycStatus === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      user.kycStatus === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                      user.kycStatus === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-zinc-500/10 text-zinc-400'
                    }`}>
                      {user.kycStatus === 'NONE' ? 'NOT SUBMITTED' : user.kycStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      user.accountStatus === 'ACTIVE' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      {user.accountStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleStatus(user)}
                      className={`h-8 px-3 border-lumina-border transition-colors ${
                        user.accountStatus === 'ACTIVE' 
                          ? 'text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30' 
                          : 'text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30'
                      }`}
                    >
                      {user.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-lumina-text-secondary">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-lumina-border bg-lumina-bg/50">
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">User</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">Request ID</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider">Document Data</th>
                <th className="p-4 text-sm font-semibold text-lumina-text-secondary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lumina-border/40">
              {filteredKyc.map((req) => (
                <tr key={req.id} className="hover:bg-lumina-surface-light/30 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-white">{req.user?.fullName}</p>
                    <p className="text-sm text-lumina-text-tertiary">{req.user?.email}</p>
                  </td>
                  <td className="p-4 text-sm text-lumina-text-secondary font-mono">{req.id.substring(0,8)}...</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      req.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-white">
                    {(() => {
                      try {
                        const data = JSON.parse(req.documentData);
                        return (
                          <div className="flex flex-col gap-1.5 text-xs text-lumina-text-secondary">
                            {data.firstName && <div><span className="text-lumina-text-tertiary">Name:</span> <span className="text-white font-medium">{data.firstName} {data.lastName}</span></div>}
                            {data.dob && <div><span className="text-lumina-text-tertiary">DOB:</span> <span className="text-white">{data.dob}</span></div>}
                            {data.address && <div><span className="text-lumina-text-tertiary">Address:</span> <span className="text-white">{data.address}</span></div>}
                            {data.accountType && <div><span className="text-lumina-text-tertiary">Account Type:</span> <span className="text-indigo-400 font-medium">{data.accountType}</span></div>}
                            {data.annualIncome && <div><span className="text-lumina-text-tertiary">Annual Income:</span> <span className="text-white font-medium">{data.annualIncome}</span></div>}
                            {data.sourceOfIncome && <div><span className="text-lumina-text-tertiary">Source:</span> <span className="text-white">{data.sourceOfIncome}</span></div>}
                            
                            <div className="mt-2 flex flex-wrap gap-2.5">
                              {data.front && <a href={getFileUrl(data.front)} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">Front ID</a>}
                              {data.back && <a href={getFileUrl(data.back)} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">Back ID</a>}
                              {data.selfie && <a href={getFileUrl(data.selfie)} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">Selfie</a>}
                              {data.proof && <a href={getFileUrl(data.proof)} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">Address Proof</a>}
                            </div>
                            {!data.front && !data.back && !data.selfie && !data.proof && <span className="break-all">{req.documentData}</span>}
                          </div>
                        );
                      } catch (e) {
                        return <span>{req.documentData}</span>;
                      }
                    })()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleApproveKyc(req.id)}
                        className="text-green-500 hover:text-green-400 hover:bg-lumina-surface-light h-8 px-2"
                      >
                        <UserCheck className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeclineKyc(req.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-lumina-surface-light h-8 px-2"
                      >
                        <UserX className="w-4 h-4 mr-1" /> Decline
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredKyc.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-lumina-text-secondary">
                    No KYC requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
