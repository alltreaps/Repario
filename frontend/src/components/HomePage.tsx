
import { useEffect, useState } from 'react';
import {
  DocumentTextIcon,
  BanknotesIcon,
  UsersIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { InvoiceWithRelations, CustomerRow } from '../lib/api';

// Direct Supabase interfaces for instant loading
interface LayoutRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Direct Supabase fetch functions for instant dashboard loading
const fetchInvoicesInstant = async (): Promise<InvoiceWithRelations[]> => {
  console.log('🌐 HomePage: Making direct Supabase call to invoices...')
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers (
        id,
        name,
        phone,
        address
      ),
      layouts (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  console.log('✅ HomePage: Invoices loaded instantly:', data?.length || 0)
  return data as InvoiceWithRelations[]
}

const fetchCustomersInstant = async (): Promise<CustomerRow[]> => {
  console.log('🌐 HomePage: Making direct Supabase call to customers...')
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  console.log('✅ HomePage: Customers loaded instantly:', data?.length || 0)
  return data as CustomerRow[]
}

const fetchLayoutsInstant = async (): Promise<LayoutRow[]> => {
  console.log('🌐 HomePage: Making direct Supabase call to layouts...')
  const { data, error } = await supabase
    .from('layouts')
    .select('id, name, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)
  
  if (error) throw error
  console.log('✅ HomePage: Layouts loaded instantly:', data?.length || 0)
  return data as LayoutRow[]
}

const fetchItemsInstant = async (): Promise<ItemRow[]> => {
  console.log('🌐 HomePage: Making direct Supabase call to items...')
  const { data, error } = await supabase
    .from('items')
    .select('id, name, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5)
  
  if (error) throw error
  console.log('✅ HomePage: Items loaded instantly:', data?.length || 0)
  return data as ItemRow[]
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [recentLayouts, setRecentLayouts] = useState<LayoutRow[]>([]);
  const [recentItems, setRecentItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Get greeting and tips based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    console.log('🔄 HomePage mounted, fetching dashboard data...')
    setLoading(true);
    Promise.all([
      fetchInvoicesInstant().catch(() => []),
      fetchCustomersInstant().catch(() => []),
      fetchLayoutsInstant().catch(() => []),
      fetchItemsInstant().catch(() => []),
    ])
      .then(([invoices, customers, recentLayouts, recentItems]) => {
        console.log('✅ HomePage: All data loaded successfully')
        setInvoices(invoices || []);
        setCustomers(customers || []);
        setRecentLayouts(recentLayouts || []);
        setRecentItems(recentItems || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('❌ HomePage: Error loading dashboard data:', err)
        setError('Failed to load dashboard data');
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="hidden lg:block mb-6 lg:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent leading-tight pb-1">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-base lg:text-lg">
            Overview of your business performance and recent activity
          </p>
        </div>

        {/* Welcome Message with Date & Time */}
        <div className="mb-8">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-center md:text-left">
              <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {getGreeting()}{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}! 👋
              </h2>
              <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
                Welcome back to your business dashboard
              </p>
            </div>
            <div className="text-center md:text-right bg-slate-50 dark:bg-slate-700 p-3 rounded-lg md:bg-transparent md:dark:bg-transparent md:p-0">
              <div className="text-lg md:text-xl font-medium text-slate-900 dark:text-slate-100">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
              <div className="text-xs md:text-sm text-slate-600 dark:text-slate-400">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total Invoices</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? '...' : invoices.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <BanknotesIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Revenue</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {loading ? '...' : invoices.reduce((sum: number, inv) => sum + (inv.total_amount || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <UsersIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Clients</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? '...' : customers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <RectangleGroupIcon className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Layouts</p>
                <p className="text-lg md:text-2xl font-semibold text-slate-900 dark:text-slate-100">{loading ? '...' : recentLayouts.length}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-slate-500">Loading...</div>
              ) : (
                <>
                  {([
                    // Layouts
                    ...recentLayouts.map(l => ({
                      type: 'layout',
                      id: l.id,
                      name: l.name,
                      date: l.updated_at || l.created_at,
                      action: (l.updated_at && l.created_at && l.updated_at !== l.created_at) ? 'updated' : 'created',
                      fields: `Name: ${l.name}`
                    })),
                    // Items
                    ...recentItems.map(i => ({
                      type: 'item',
                      id: i.id,
                      name: i.name,
                      date: i.updated_at || i.created_at,
                      action: (i.updated_at && i.created_at && i.updated_at !== i.created_at) ? 'updated' : 'created',
                      fields: `Name: ${i.name}`
                    })),
                    // Invoices
                    ...invoices.slice(0, 5).map(inv => ({
                      type: 'invoice',
                      id: inv.id,
                      name: inv.customers?.name || 'Client',
                      date: inv.updated_at || inv.created_at,
                      action: (inv.updated_at && inv.created_at && inv.updated_at !== inv.created_at) ? 'updated' : 'created',
                      fields: `Amount: $${(inv.total_amount || 0).toFixed(2)}`
                    })),
                    // Customers
                    ...customers
                      .sort((a, b) => {
                        const dateA = new Date(a.updated_at || a.created_at).getTime();
                        const dateB = new Date(b.updated_at || b.created_at).getTime();
                        return dateB - dateA;
                      })
                      .slice(0, 5)
                      .map(cust => ({
                        type: 'customer',
                        id: cust.id,
                        name: cust.name,
                        date: cust.updated_at || cust.created_at,
                        action: (cust.updated_at && cust.created_at && cust.updated_at !== cust.created_at) ? 'updated' : 'created',
                        fields: `Phone: ${cust.phone || ''}`
                      })),
                    // Example: If you have deleted records, add them here
                    // ...deletedLayouts.map(l => ({ type: 'layout', id: l.id, name: l.name, date: l.deleted_at, action: 'deleted', fields: `Name: ${l.name}` })),
                    // ...deletedItems.map(i => ({ type: 'item', id: i.id, name: i.name, date: i.deleted_at, action: 'deleted', fields: `Name: ${i.name}` })),
                    // ...deletedInvoices.map(inv => ({ type: 'invoice', id: inv.id, name: inv.customers?.name || 'Client', date: inv.deleted_at, action: 'deleted', fields: `Amount: $${(inv.total_amount || 0).toFixed(2)}` })),
                    // ...deletedCustomers.map(cust => ({ type: 'customer', id: cust.id, name: cust.name, date: cust.deleted_at, action: 'deleted', fields: `Phone: ${cust.phone || ''}` })),
                  ]
                    .filter(a => a.date)
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .slice(0, 5)
                  ).map(activity => (
                    <div className="flex items-center" key={activity.type + '-' + activity.id + '-' + activity.action}>
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        activity.action === 'deleted' ? 'bg-red-500' :
                        activity.type === 'layout' ? 'bg-yellow-500' :
                        activity.type === 'item' ? 'bg-pink-500' :
                        activity.type === 'invoice' ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}></div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {activity.type === 'layout' && `Layout "${activity.name}" ${activity.action}`}
                        {activity.type === 'item' && `Item "${activity.name}" ${activity.action}`}
                        {activity.type === 'invoice' && `Invoice for ${activity.name} ${activity.action}`}
                        {activity.type === 'customer' && `Client "${activity.name}" ${activity.action}`}
                        {/* Removed activity.fields display as requested */}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-lg hover:from-blue-700 hover:to-blue-500 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-blue-500/25 relative overflow-hidden group"
                onClick={() => navigate('/invoices/new')}
              >
                <div className="relative z-10 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-white transition-colors" />
                  Create New Invoice
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
              <button
                className="w-full text-left px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-400 text-white rounded-lg hover:from-purple-700 hover:to-purple-500 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-purple-500/25 relative overflow-hidden group"
                onClick={() => navigate('/layouts')}
              >
                <div className="relative z-10 flex items-center">
                  <RectangleGroupIcon className="w-5 h-5 mr-2 text-white transition-colors" />
                  Design New Layout
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
              <button
                className="w-full text-left px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-400 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-500 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-emerald-500/25 relative overflow-hidden group"
                onClick={() => navigate('/accounts')}
              >
                <div className="relative z-10 flex items-center">
                  <UsersIcon className="w-5 h-5 mr-2 text-white transition-colors" />
                  Add New Client
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
