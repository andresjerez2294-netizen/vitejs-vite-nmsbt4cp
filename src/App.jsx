import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Brain, Check, Settings, 
  Edit2, X, AlertTriangle, Search, CreditCard, Smartphone, Banknote, 
  Calendar, BarChart3, ChevronDown, ChevronUp, ArrowRightLeft, 
  Trash2 // <--- ¡AQUÍ ESTÁ EL CULPABLE! Ya lo agregué.
} from 'lucide-react';
import { 
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

// --- FIREBASE ---
import { db } from './firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

// --- ESTILOS CSS INYECTADOS (SCROLLBAR HIDE) ---
const GlobalStyles = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .glass-toast {
      background: rgba(16, 185, 129, 0.2);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
    }
  `}</style>
);

// --- UTILIDADES ---
const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
};

// --- COMPONENTES UI ---

const MoneyInput = ({ value, onChange, placeholder }) => {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };
  const display = value ? new Intl.NumberFormat('es-CO').format(value) : '';
  return (
    <div className="relative w-full bg-slate-900 border border-slate-700 rounded-3xl flex items-center px-5 py-4 focus-within:border-purple-500 transition-colors">
      <span className="text-slate-400 mr-2 font-bold">$</span>
      <input type="text" value={display} onChange={handleChange} placeholder={placeholder} className="bg-transparent text-white w-full outline-none font-bold text-lg placeholder-slate-600"/>
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] w-full max-w-lg rounded-[2rem] border border-slate-700 shadow-2xl max-h-[85vh] overflow-y-auto scrollbar-hide">
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center sticky top-0 bg-[#1e293b] z-10">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, type }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-5 py-4 text-left text-white flex justify-between items-center outline-none focus:border-purple-500">
        <span className={value ? "text-white font-medium" : "text-slate-500"}>{value || "Seleccionar..."}</span>
        <ChevronDown size={18} className={`transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>
      {isOpen && (
        <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-slate-700 rounded-3xl shadow-xl max-h-60 overflow-y-auto scrollbar-hide p-2">
          {type === 'category' ? (
             options.map((grp, i) => (
               <div key={i}>
                 <div className={`text-xs font-bold uppercase tracking-wider px-3 py-2 mt-1 ${grp.color}`}>{grp.label}</div>
                 {grp.items.map(c => (
                   <div key={c} onClick={() => { onChange(c); setIsOpen(false); }} className="p-3 hover:bg-slate-700 rounded-2xl cursor-pointer text-white text-sm font-medium ml-2">
                     {c}
                   </div>
                 ))}
               </div>
             ))
          ) : (
            options.map(acc => (
              <div key={acc.id} onClick={() => { onChange(acc.id); setIsOpen(false); }} className="p-3 hover:bg-slate-700 rounded-2xl cursor-pointer text-white flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: acc.color}}></div>
                <span className="font-medium">{acc.name}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Toast = ({ message, show }) => {
  if (!show) return null;
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 glass-toast text-emerald-400 px-6 py-4 rounded-2xl shadow-2xl z-[70] flex items-center gap-3 animate-in slide-in-from-top-4 fade-in">
      <div className="bg-emerald-500/20 p-2 rounded-full"><Check size={20} /></div>
      <span className="font-bold text-sm tracking-wide">{message}</span>
    </div>
  );
};

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [appTitle, setAppTitle] = useState(() => localStorage.getItem('app_title') || 'Finanzas Andrés');
  
  // Datos Persistentes
  const [fixedExpensesList, setFixedExpensesList] = useState(() => {
    const saved = localStorage.getItem('my_fixed_list_v6');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Administración', budget: 133000 }, { id: 2, name: 'Luz', budget: 100000 },
      { id: 3, name: 'Agua', budget: 50000 }, { id: 4, name: 'Gas', budget: 15000 },
      { id: 5, name: 'Parqueadero', budget: 20000 }, { id: 6, name: 'Crédito Apto', budget: 110000 },
      { id: 7, name: 'Tarjeta de Crédito', budget: 200000 }, { id: 8, name: 'Internet Hogar', budget: 105000 },
      { id: 9, name: 'Plan Celular', budget: 35000 }, { id: 10, name: 'Gasolina', budget: 120000 },
      { id: 11, name: 'Aceite Moto', budget: 40000 },
    ];
  });

  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('my_accounts_v5');
    return saved ? JSON.parse(saved) : [
      { id: 'bancolombia', name: 'Bancolombia', color: '#FCD34D', text: 'text-black', icon: CreditCard }, 
      { id: 'nu', name: 'Nu', color: '#8B5CF6', text: 'text-white', icon: CreditCard },       
      { id: 'nequi', name: 'Nequi', color: '#EC4899', text: 'text-white', icon: Smartphone },    
      { id: 'efectivo', name: 'Efectivo', color: '#10B981', text: 'text-white', icon: Banknote } 
    ];
  });

  // UI States
  const [showConfig, setShowConfig] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const [activeTab, setActiveTab] = useState('fixed'); // 'fixed' | 'variable'
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  // Form
  const [formData, setFormData] = useState({
    description: '', amount: '', type: 'expense', category: '', 
    account: '', toAccount: '', date: new Date().toISOString().split('T')[0]
  });

  // Effects
  useEffect(() => { localStorage.setItem('app_title', appTitle); }, [appTitle]);
  useEffect(() => { localStorage.setItem('my_fixed_list_v6', JSON.stringify(fixedExpensesList)); }, [fixedExpensesList]);
  useEffect(() => { localStorage.setItem('my_accounts_v5', JSON.stringify(accounts)); }, [accounts]);

  useEffect(() => {
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    return onSnapshot(q, (snapshot) => setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
  }, []);

  // --- LOGICA ---
  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.date) return;
    const selectedAccount = formData.account || accounts[0]?.id;

    try {
      if (formData.type === 'transfer') {
        if (!formData.account || !formData.toAccount) return alert("Selecciona cuentas");
        const base = { amount: Number(formData.amount), category: 'Transferencia', date: formData.date, isTransfer: true };
        await addDoc(collection(db, "transactions"), { ...base, description: `Transf. a ${accounts.find(a=>a.id===formData.toAccount)?.name}`, type: 'expense', account: formData.account });
        await addDoc(collection(db, "transactions"), { ...base, description: `Recibido de ${accounts.find(a=>a.id===formData.account)?.name}`, type: 'income', account: formData.toAccount });
      } else {
        await addDoc(collection(db, "transactions"), { ...formData, account: selectedAccount, amount: Number(formData.amount), createdAt: new Date() });
      }
      setFormData(prev => ({ ...prev, description: '', amount: '' }));
      setToastMsg("¡Transacción Guardada!");
      setTimeout(()=>setToastMsg(''), 3000);
    } catch (e) { console.error(e); }
  };

  const deleteTransaction = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, "transactions", id)); };

  // --- CÁLCULOS ---
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyTrans = transactions.filter(t => {
    const d = new Date(t.date);
    const localD = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
    return localD.getMonth() === currentMonth && localD.getFullYear() === currentYear;
  });

  // Totales
  const totalIncome = monthlyTrans.filter(t => t.type === 'income' && !t.isTransfer).reduce((a, t) => a + t.amount, 0);
  const totalExpenses = monthlyTrans.filter(t => t.type === 'expense' && !t.isTransfer).reduce((a, t) => a + t.amount, 0);
  
  // Variables vs Fijos
  const fixedNames = fixedExpensesList.map(i => i.name);
  const variableTrans = monthlyTrans.filter(t => t.type === 'expense' && !t.isTransfer && !fixedNames.includes(t.category));
  const totalVariable = variableTrans.reduce((a, t) => a + t.amount, 0);
  
  // Status Fijos
  const fixedStatus = fixedExpensesList.map(i => {
    const t = monthlyTrans.find(tr => tr.type === 'expense' && tr.category === i.name);
    return { ...i, real: t ? t.amount : 0, paid: !!t, paidWith: t ? accounts.find(a=>a.id===t.account)?.name : '-' };
  });
  
  const totalBudgetFixed = fixedStatus.reduce((a,i) => a + i.budget, 0);
  const totalRealFixed = fixedStatus.reduce((a,i) => a + i.real, 0);
  const pendingFixed = fixedStatus.filter(i=>!i.paid).reduce((a,i)=>a+i.budget, 0);

  // Disponibles
  const realAvailable = totalIncome - totalExpenses;
  const virtualAvailable = realAvailable - pendingFixed;

  // Resumen Variables (Tabla Tab 2)
  const variableSummary = variableTrans.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});
  const pieData = Object.keys(variableSummary).map(k => ({ name: k, value: variableSummary[k] }));
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

  // Anual
  const annualData = Array.from({length: 12}, (_, i) => {
    const mt = transactions.filter(t => { const d=new Date(t.date); return d.getMonth()===i && d.getFullYear()===currentYear; });
    return {
      name: new Date(0, i).toLocaleString('es',{month:'short'}),
      Ing: mt.filter(t=>t.type==='income').reduce((a,c)=>a+c.amount,0),
      Gas: mt.filter(t=>t.type==='expense').reduce((a,c)=>a+c.amount,0)
    };
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans pb-32">
      <GlobalStyles />
      <Toast message={toastMsg} show={!!toastMsg} />

      {/* HEADER */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2.5 rounded-2xl shadow-lg"><Wallet className="text-white" /></div>
          {appTitle}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowAnnual(true)} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition-all"><Calendar size={20}/></button>
          <button onClick={() => {
             const p = `Resumen:\nIngresos: ${formatCurrency(totalIncome)}\nGastos: ${formatCurrency(totalExpenses)}\nDisponible: ${formatCurrency(virtualAvailable)}\nAyuda?`;
             navigator.clipboard.writeText(p); setToastMsg("📋 Copiado al portapapeles"); setTimeout(()=>setToastMsg(''),3000);
          }} className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"><Brain size={20}/></button>
          <button onClick={() => setShowConfig(true)} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 text-slate-300 border border-slate-700"><Settings size={20} /></button>
        </div>
      </div>

      {/* 4 KPIs - SOLICITUD EXACTA */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 1. INGRESOS */}
        <div className="bg-emerald-900/20 p-5 rounded-[2rem] border border-emerald-500/20 backdrop-blur-sm">
          <p className="text-emerald-400 text-xs uppercase font-bold tracking-wider mb-1">Ingresos</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-300 truncate">{formatCurrency(totalIncome)}</p>
        </div>
        
        {/* 2. GASTOS TOTALES */}
        <div className="bg-red-900/20 p-5 rounded-[2rem] border border-red-500/20 backdrop-blur-sm">
          <p className="text-red-400 text-xs uppercase font-bold tracking-wider mb-1">Gastos Totales</p>
          <p className="text-xl md:text-2xl font-bold text-red-300 truncate">{formatCurrency(totalExpenses)}</p>
        </div>

        {/* 3. GASTOS VARIABLES */}
        <div className="bg-blue-900/20 p-5 rounded-[2rem] border border-blue-500/20 backdrop-blur-sm">
          <p className="text-blue-400 text-xs uppercase font-bold tracking-wider mb-1">G. Variables</p>
          <p className="text-xl md:text-2xl font-bold text-blue-300 truncate">{formatCurrency(totalVariable)}</p>
        </div>

        {/* 4. DISPONIBLE (2 EN 1) */}
        <div className={`p-5 rounded-[2rem] border shadow-xl relative overflow-hidden ${virtualAvailable >= 0 ? 'bg-emerald-600 border-emerald-500' : 'bg-[#1e293b] border-red-500/50'}`}>
          <div className="absolute right-0 top-0 opacity-10 p-3"><Wallet size={50} className="text-white"/></div>
          <div className="relative z-10">
            <p className={`text-xs uppercase font-bold tracking-wider mb-0.5 ${virtualAvailable >= 0 ? 'text-white/70' : 'text-red-400'}`}>Disponible Seguro</p>
            <p className={`text-2xl md:text-3xl font-bold truncate ${virtualAvailable >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(virtualAvailable)}</p>
            <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg inline-block ${virtualAvailable >= 0 ? 'bg-white/20 text-white' : 'bg-red-900/30 text-red-300'}`}>
              Real en Banco: {formatCurrency(realAvailable)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-[2rem] border border-slate-700 shadow-xl sticky top-6">
            <div className="flex bg-slate-900 p-1.5 rounded-3xl mb-6">
              {['income', 'expense', 'transfer'].map(type => (
                <button key={type} onClick={() => setFormData({...formData, type, category: ''})}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold capitalize transition-all ${
                    formData.type === type 
                    ? (type === 'income' ? 'bg-emerald-600' : type === 'expense' ? 'bg-red-600' : 'bg-blue-600') + ' text-white shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'income' ? 'Ingreso' : type === 'expense' ? 'Gasto' : 'Transferir'}
                </button>
              ))}
            </div>

            <form onSubmit={handleTransaction} className="space-y-4">
              {/* CUENTAS O TRANSFERENCIA */}
              {formData.type === 'transfer' ? (
                <div className="grid grid-cols-2 gap-3">
                  <CustomSelect value={accounts.find(a=>a.id===formData.account)?.name} onChange={v=>setFormData({...formData, account: v})} options={accounts} type="account" />
                  <CustomSelect value={accounts.find(a=>a.id===formData.toAccount)?.name} onChange={v=>setFormData({...formData, toAccount: v})} options={accounts} type="account" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {accounts.map(acc => (
                    <button type="button" key={acc.id} onClick={() => setFormData({...formData, account: acc.id})}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        formData.account === acc.id || (!formData.account && acc.id === accounts[0].id)
                        ? `${acc.color} ${acc.text} ring-2 ring-offset-2 ring-offset-[#1e293b] ring-[${acc.color}]` 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                      style={(formData.account === acc.id || (!formData.account && acc.id === accounts[0].id)) ? { backgroundColor: acc.color } : {}}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              )}

              {/* INPUTS */}
              <MoneyInput value={formData.amount} onChange={(v)=>setFormData({...formData, amount: v})} placeholder="Monto" />
              
              {formData.type !== 'transfer' && (
                <>
                  <input type="text" placeholder="Descripción" className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-5 py-4 text-white outline-none focus:border-purple-500 transition-colors"
                    value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
                  
                  <CustomSelect 
                    value={formData.category} 
                    onChange={c=>setFormData({...formData, category: c})} 
                    options={formData.type === 'income' 
                      ? [{label:'Ingresos', color:'text-emerald-400', items:['Salario', 'Negocios', 'Venta', 'Otros']}] 
                      : [
                          {label:'Gastos Fijos', color:'text-orange-400', items: fixedNames},
                          {label:'Gastos Variables', color:'text-blue-400', items: ['Alimentación', 'Transporte', 'Vivienda Extra', 'Salud', 'Educación', 'Diversión', 'Otros']}
                        ]
                    } 
                    type="category" 
                  />
                </>
              )}

              <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-5 py-4 text-white outline-none focus:border-purple-500 [color-scheme:dark]"
                value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />

              <button type="submit" className={`w-full font-bold py-4 rounded-3xl transition-all shadow-lg active:scale-95 ${
                formData.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 
                formData.type === 'expense' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'
              } text-white`}>
                {formData.type === 'income' ? 'Registrar Ingreso' : formData.type === 'expense' ? 'Registrar Gasto' : 'Transferir'}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA CON PESTAÑAS + HISTORIAL */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TABLA PRINCIPAL (TABS) */}
          <div className="bg-[#1e293b] rounded-[2rem] border border-slate-700 shadow-xl overflow-hidden min-h-[400px]">
            {/* TABS HEADERS */}
            <div className="flex border-b border-slate-700">
              <button onClick={() => setActiveTab('fixed')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'fixed' ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>
                GASTOS FIJOS
              </button>
              <button onClick={() => setActiveTab('variable')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'variable' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                GASTOS VARIABLES
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="overflow-x-auto scrollbar-hide">
              {activeTab === 'fixed' ? (
                // TABLA FIJOS
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                    <tr><th className="px-5 py-4">Concepto</th><th className="px-5 py-4">Presupuesto</th><th className="px-5 py-4">Real</th><th className="px-5 py-4">Pago Con</th><th className="px-5 py-4 text-center">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {fixedStatus.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-4 font-medium text-white">{item.name}</td>
                        <td className="px-5 py-4 text-slate-400">{formatCurrency(item.budget)}</td>
                        <td className="px-5 py-4 text-white font-bold">{item.paid ? formatCurrency(item.real) : '-'}</td>
                        <td className="px-5 py-4 text-xs">{item.paid ? <span className="bg-slate-700 px-2 py-1 rounded text-slate-200">{item.paidWith}</span> : '-'}</td>
                        <td className="px-5 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${item.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{item.paid ? 'PAGADO' : 'PENDIENTE'}</span></td>
                      </tr>
                    ))}
                    <tr className="bg-slate-800/90 font-bold border-t-2 border-slate-600 text-xs uppercase"><td className="px-5 py-4 text-white">TOTALES</td><td className="px-5 py-4 text-orange-400">{formatCurrency(totalBudgetFixed)}</td><td className="px-5 py-4 text-emerald-400">{formatCurrency(totalRealFixed)}</td><td colSpan="2"></td></tr>
                  </tbody>
                </table>
              ) : (
                // TABLA VARIABLES (RESUMEN)
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                    <tr><th className="px-6 py-4">Categoría Variable</th><th className="px-6 py-4 text-right">Total Gastado</th><th className="px-6 py-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {Object.keys(variableSummary).length === 0 ? (
                      <tr><td colSpan="3" className="p-8 text-center text-slate-500">No hay gastos variables este mes.</td></tr>
                    ) : (
                      Object.keys(variableSummary).map(cat => (
                        <tr key={cat} className="hover:bg-slate-800/30">
                          <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>{cat}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-200">{formatCurrency(variableSummary[cat])}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 text-right">{(variableSummary[cat]/totalExpenses*100).toFixed(1)}%</td>
                        </tr>
                      ))
                    )}
                     <tr className="bg-slate-800/90 font-bold border-t-2 border-slate-600 text-xs uppercase"><td className="px-6 py-4 text-white">TOTAL VARIABLE</td><td className="px-6 py-4 text-right text-blue-400">{formatCurrency(totalVariable)}</td><td></td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* HISTORIAL MOVIMIENTOS */}
          <div className="bg-[#1e293b] rounded-[2rem] border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-300">Últimos Movimientos</h3>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{monthlyTrans.length}</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              {monthlyTrans.slice(0, expandedHistory ? undefined : 5).map((t) => {
                 const isInc = t.type === 'income';
                 return (
                   <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-800/30">
                     <div className="flex items-center gap-4">
                       <div className={`p-3 rounded-2xl ${isInc ? 'bg-emerald-500/10 text-emerald-400' : t.category==='Transferencia'?'bg-blue-500/10 text-blue-400':'bg-red-500/10 text-red-400'}`}>
                         {t.category==='Transferencia' ? <ArrowRightLeft size={18}/> : isInc ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                       </div>
                       <div>
                         <p className="font-bold text-white">{t.description}</p>
                         <p className="text-xs text-slate-500 mt-1">{t.date} • {t.category}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className={`font-bold ${isInc ? 'text-emerald-400' : 'text-slate-200'}`}>{isInc?'+':'-'} {formatCurrency(t.amount)}</span>
                       <button onClick={async()=> {if(confirm("Borrar?")) await deleteDoc(doc(db,"transactions",t.id))}} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button>
                     </div>
                   </div>
                 )
              })}
            </div>
            {monthlyTrans.length > 5 && (
              <button onClick={() => setExpandedHistory(!expandedHistory)} className="w-full p-4 text-center text-sm text-blue-400 font-medium border-t border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                {expandedHistory ? "Ver menos" : "Ver historial completo"}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 5. ANÁLISIS MENSUAL (AL FINAL DE TODO) */}
      <div className="max-w-5xl mx-auto mt-12 bg-[#1e293b] p-8 rounded-[2rem] border border-slate-700 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="text-purple-500"/> Análisis Mensual</h3>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-1/3 h-64">
            <ResponsiveContainer><RechartsPie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>{pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}</RechartsPie></ResponsiveContainer>
          </div>
          <div className="w-full md:w-2/3 space-y-4">
             <div className="bg-slate-800 p-4 rounded-2xl">
               <div className="flex justify-between text-sm mb-2 font-bold text-white"><span>Gasto vs Ingreso</span><span>{((totalExpenses/totalIncome)*100 || 0).toFixed(1)}%</span></div>
               <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden"><div className="bg-purple-500 h-full rounded-full" style={{width: `${Math.min((totalExpenses/totalIncome)*100, 100)}%`}}></div></div>
             </div>
             <div className="grid grid-cols-2 gap-2">
               {pieData.map((e,i) => (<div key={i} className="flex items-center gap-2 text-xs text-slate-300"><div className="w-2 h-2 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/>{e.name}: {formatCurrency(e.value)}</div>))}
             </div>
          </div>
        </div>
      </div>

      {/* MODAL CONFIG */}
      <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} title="Ajustes">
        <div className="space-y-6">
          <div className="bg-slate-900 p-5 rounded-3xl">
            <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Nombre</label>
            <div className="flex gap-2"><input value={appTitle} onChange={e=>setAppTitle(e.target.value)} className="bg-transparent border-b border-purple-500 text-white w-full outline-none"/><Edit2 size={16} className="text-purple-500"/></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl">
            <h3 className="text-white font-bold mb-4">Cuentas</h3>
            <div className="space-y-2">{accounts.map(acc=><div key={acc.id} className="flex justify-between p-2 bg-slate-800 rounded-xl text-white text-sm"><span>{acc.name}</span><Trash2 size={14} className="text-red-400 cursor-pointer" onClick={()=>setAccounts(accounts.filter(a=>a.id!==acc.id))} /></div>)}</div>
          </div>
          <div className="bg-slate-900 p-5 rounded-3xl">
             <h3 className="text-white font-bold mb-4">Gastos Fijos</h3>
             <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">{fixedExpensesList.map(i=><div key={i.id} className="flex justify-between p-2 bg-slate-800 rounded-xl text-white text-sm"><span>{i.name} ({formatCurrency(i.budget)})</span><Trash2 size={14} className="text-red-400 cursor-pointer" onClick={()=>setFixedExpensesList(fixedExpensesList.filter(x=>x.id!==i.id))} /></div>)}</div>
          </div>
        </div>
      </Modal>

      {/* MODAL ANUAL */}
      <Modal isOpen={showAnnual} onClose={() => setShowAnnual(false)} title="Análisis Anual">
        <div className="h-80 w-full"><ResponsiveContainer><BarChart data={annualData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/><XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false}/><YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/><Tooltip contentStyle={{backgroundColor:'#1e293b',border:'none',borderRadius:'12px'}}/><Bar dataKey="Ing" fill="#10b981" radius={[4,4,0,0]}/><Bar dataKey="Gas" fill="#ef4444" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      </Modal>

    </div>
  );
}