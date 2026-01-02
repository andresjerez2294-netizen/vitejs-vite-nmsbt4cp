import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Settings, 
  X, Search, Calendar, BarChart3, ChevronDown, ArrowRightLeft, 
  Trash2, LogOut, Plus, RefreshCw, CheckCircle, AlertOctagon,
  Edit2, Brain, Copy, Target, PiggyBank
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { db } from './firebase'; 
import { collection, addDoc, onSnapshot, deleteDoc, doc, query, where, getDocs, writeBatch, setDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";

// --- ESTILOS GLOBAL ---
const GlobalStyles = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .toast-visible { background-color: #0f172a; border: 1px solid #10b981; color: #10b981; box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.5); }
    .toast-error { background-color: #450a0a; border: 1px solid #ef4444; color: #ef4444; box-shadow: 0 10px 40px -10px rgba(239, 68, 68, 0.5); }
    input[type="color"] { -webkit-appearance: none; border: none; width: 32px; height: 32px; border-radius: 50%; overflow: hidden; cursor: pointer; padding: 0; background: none; }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 50%; border: 2px solid #334155; }
    input[type="date"] { color-scheme: dark; cursor: pointer; }
    .recharts-text { fill: #94a3b8 !important; font-size: 11px; font-weight: bold; }
  `}</style>
);

// --- UTILIDADES ---
const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);
const formatNumberString = (val) => val ? new Intl.NumberFormat('es-CO').format(val.replace(/\D/g, '')) : '';
const parseNumberString = (val) => val ? Number(val.replace(/\./g, '')) : 0;
const getDateObject = (dateString) => new Date(dateString + 'T00:00:00');

// --- COMPONENTES REUTILIZABLES ---
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, isDanger }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl p-6 text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
          {isDanger ? <AlertOctagon size={24}/> : <CheckCircle size={24}/>}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm">Cancelar</button>
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-sm text-white ${isDanger ? 'bg-red-600' : 'bg-blue-600'}`}>Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const CustomSelect = ({ value, onChange, options, type, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  let displayLabel = value;
  if(type === 'month') displayLabel = options[value];
  if(type === 'account') displayLabel = options.find(o => o.id === value)?.name || "Seleccionar...";
  if(type === 'goal') displayLabel = value;
  
  return (
    <div className="relative w-full">
      {label && <span className="text-xs text-slate-500 font-bold ml-2 mb-1 block uppercase">{label}</span>}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-5 py-3 text-left text-white flex justify-between items-center outline-none focus:border-purple-500 hover:bg-slate-800 transition-colors shadow-sm">
        <span className={`font-bold truncate ${!value ? 'text-slate-500' : ''}`}>{displayLabel || "Seleccionar..."}</span>
        <ChevronDown size={18} className={`transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-20 w-full mt-2 bg-[#1e293b] border border-slate-700 rounded-[1.5rem] shadow-2xl max-h-60 overflow-y-auto scrollbar-hide p-2 animate-in fade-in zoom-in-95 duration-100">
            {type === 'category' ? (
               options.map((grp, i) => (<div key={i}><div className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 mt-1 ${grp.color}`}>{grp.label}</div>{grp.items.map(c => (<div key={c} onClick={() => { onChange(c); setIsOpen(false); }} className="p-3 hover:bg-slate-700 rounded-2xl cursor-pointer text-white text-sm font-medium ml-2 transition-colors">{c}</div>))}</div>))
            ) : type === 'account' ? (
              options.map(acc => (<div key={acc.id} onClick={() => { onChange(acc.id); setIsOpen(false); }} className="p-3 hover:bg-slate-700 rounded-2xl cursor-pointer text-white flex items-center gap-3 transition-colors"><div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: acc.color}}></div><span className="font-medium">{acc.name}</span></div>))
            ) : type === 'month' ? (
              options.map((m, i) => (<div key={i} onClick={() => { onChange(i); setIsOpen(false); }} className={`p-3 rounded-2xl cursor-pointer text-sm font-bold text-center transition-colors ${value === i ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{m}</div>))
            ) : ( options.map(opt => (<div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`p-3 rounded-2xl cursor-pointer text-sm font-bold text-left transition-colors ${value === opt ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{opt}</div>))
            )}
          </div>
        </>
      )}
    </div>
  );
};

const MoneyInput = ({ value, onChange, placeholder }) => {
  const handleChange = (e) => { const raw = e.target.value.replace(/\D/g, ''); onChange(raw); };
  const display = value ? new Intl.NumberFormat('es-CO').format(value) : '';
  return (
    <div className="relative w-full bg-slate-900 border border-slate-700 rounded-3xl flex items-center px-5 py-4 focus-within:border-purple-500 transition-colors">
      <span className="text-slate-400 mr-2 font-bold">$</span>
      <input type="text" value={display} onChange={handleChange} placeholder={placeholder} className="bg-transparent text-white w-full outline-none font-bold text-lg placeholder-slate-600"/>
    </div>
  );
};

// --- SUB-COMPONENTES ---

const AccountsPanel = ({ accounts, transactions }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
      {accounts.map(acc => {
        const income = transactions.filter(t => t.type === 'income' && t.account === acc.id).reduce((a, t) => a + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense' && t.account === acc.id).reduce((a, t) => a + t.amount, 0);
        const balance = income - expense;
        return (
          <div key={acc.id} className="bg-[#1e293b] p-4 rounded-[1.5rem] border border-slate-700 shadow-lg flex flex-col justify-between hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-2 mb-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: acc.color}}></div><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{acc.name}</span></div>
            <p className="text-base font-bold text-white truncate">{formatCurrency(balance)}</p>
          </div>
        );
      })}
    </div>
  );
};

const KpiCards = ({ totalIncome, totalExpenses, totalVariable, virtualAvailable }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div className="bg-emerald-900/10 p-5 rounded-[2rem] border border-emerald-500/20 backdrop-blur-sm"><p className="text-emerald-400 text-xs uppercase font-bold tracking-wider mb-1">Ingresos</p><p className="text-lg md:text-xl font-bold text-emerald-300 truncate">{formatCurrency(totalIncome)}</p></div>
    <div className="bg-red-900/10 p-5 rounded-[2rem] border border-red-500/20 backdrop-blur-sm"><p className="text-red-400 text-xs uppercase font-bold tracking-wider mb-1">Gastos</p><p className="text-lg md:text-xl font-bold text-red-300 truncate">{formatCurrency(totalExpenses)}</p></div>
    <div className="bg-blue-900/10 p-5 rounded-[2rem] border border-blue-500/20 backdrop-blur-sm"><p className="text-blue-400 text-xs uppercase font-bold tracking-wider mb-1">Variables</p><p className="text-lg md:text-xl font-bold text-blue-300 truncate">{formatCurrency(totalVariable)}</p></div>
    <div className={`p-5 rounded-[2rem] border shadow-xl relative overflow-hidden ${virtualAvailable > 0 ? 'bg-emerald-600 border-emerald-500' : 'bg-[#1e293b] border-slate-700'}`}>
      <div className="relative z-10"><p className={`text-xs uppercase font-bold tracking-wider mb-0.5 ${virtualAvailable > 0 ? 'text-white/80' : 'text-slate-500'}`}>Disponible Virtual</p><p className={`text-xl md:text-2xl font-bold truncate ${virtualAvailable > 0 ? 'text-white' : 'text-slate-500'}`}>{formatCurrency(virtualAvailable)}</p></div>
    </div>
  </div>
);

const TransactionForm = ({ formData, setFormData, onSave, accounts, fixedNames, mainGoal, copyAIContext }) => {
  return (
    <div className="bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-700 shadow-xl sticky top-6 space-y-6">
      <div onClick={copyAIContext} className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 p-4 rounded-3xl cursor-pointer hover:border-purple-400 transition-all flex items-center justify-between group">
          <div className="flex items-center gap-3"><div className="bg-purple-600 p-2 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform"><Brain size={20}/></div><div><p className="text-sm font-bold text-white">Análisis & Consejos</p><p className="text-[10px] text-purple-200">{mainGoal.substring(0, 25)}...</p></div></div><Copy size={16} className="text-purple-300"/>
      </div>
      <div>
        <div className="flex bg-slate-900 p-1.5 rounded-3xl mb-6">{['income', 'expense', 'transfer'].map(type => (<button key={type} onClick={() => setFormData({...formData, type, category: ''})} className={`flex-1 py-3 rounded-2xl text-xs font-bold capitalize transition-all ${formData.type === type ? (type === 'income' ? 'bg-emerald-600' : type === 'expense' ? 'bg-red-600' : 'bg-blue-600') + ' text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{type === 'income' ? 'Ingreso' : type === 'expense' ? 'Gasto' : 'Transf.'}</button>))}</div>
        <form onSubmit={onSave} className="space-y-4">
          {formData.type === 'transfer' ? (<div className="grid grid-cols-2 gap-3"><CustomSelect value={formData.account} onChange={v=>setFormData({...formData, account: v})} options={accounts} type="account" label="Desde" /><CustomSelect value={formData.toAccount} onChange={v=>setFormData({...formData, toAccount: v})} options={accounts} type="account" label="Para" /></div>) : (<div className="grid grid-cols-2 gap-2">{accounts.map(acc => ( <button type="button" key={acc.id} onClick={() => setFormData({...formData, account: acc.id})} className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 ${formData.account === acc.id || (!formData.account && acc.id === accounts[0].id) ? `${acc.color} text-black ring-2 ring-offset-2 ring-offset-[#1e293b]` : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`} style={(formData.account === acc.id || (!formData.account && acc.id === accounts[0].id)) ? { backgroundColor: acc.color } : {}}>{acc.name}</button> ))}</div>)}
          <MoneyInput value={formData.amount} onChange={(v)=>setFormData({...formData, amount: v})} placeholder="Monto" />
          {formData.type !== 'transfer' && (<><input type="text" placeholder="Descripción" className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-5 py-4 text-white outline-none focus:border-purple-500 transition-colors" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /><CustomSelect value={formData.category} onChange={c=>setFormData({...formData, category: c})} options={formData.type === 'income' ? [{label:'Ingresos', color:'text-emerald-400', items:['Salario', 'Negocios', 'Venta', 'Otros']}] : [{label:'Gastos Fijos', color:'text-orange-400', items: fixedNames},{label:'Gastos Variables', color:'text-blue-400', items: ['Alimentación', 'Transporte', 'Vivienda Extra', 'Salud', 'Educación', 'Diversión', 'Otros']}]} type="category" /></>)}
          <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-3xl px-5 py-4 text-white outline-none focus:border-purple-500 transition-colors font-bold"/>
          <button type="submit" className={`w-full font-bold py-4 rounded-3xl transition-all shadow-lg active:scale-95 ${formData.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : formData.type === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>Guardar Movimiento</button>
        </form>
      </div>
    </div>
  );
};

const ExpensesAndHistory = ({ 
  activeTab, setActiveTab, fixedProgress, fixedStatus, variableSummary, 
  totalBudgetFixed, totalRealFixed, filteredHistory, searchTerm, setSearchTerm, 
  expandedHistory, setExpandedHistory, onDelete 
}) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700 shadow-xl overflow-hidden min-h-[400px]">
        <div className="flex border-b border-slate-700"><button onClick={() => setActiveTab('fixed')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'fixed' ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-400' : 'text-slate-500 hover:text-slate-300'}`}>GASTOS FIJOS</button><button onClick={() => setActiveTab('variable')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'variable' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>VARIABLES</button></div>
        {activeTab === 'fixed' && (<div className="px-5 pt-5 pb-2"><div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider"><span>Progreso de Pagos</span><span>{Math.round(fixedProgress)}%</span></div><div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700/50"><div className={`h-full transition-all duration-500 ${fixedProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${fixedProgress}%`}}></div></div></div>)}
        <div className="overflow-x-auto scrollbar-hide">
          {activeTab === 'fixed' ? (<table className="w-full text-sm text-left"><thead className="text-xs text-slate-400 uppercase bg-slate-800/50"><tr><th className="px-5 py-4">Concepto</th><th className="px-5 py-4">Presupuesto</th><th className="px-5 py-4">Real</th><th className="px-5 py-4">Pago Con</th><th className="px-5 py-4 text-center">Estado</th></tr></thead><tbody className="divide-y divide-slate-700/50">{fixedStatus.map((item) => (<tr key={item.id} className="hover:bg-slate-800/30"><td className="px-5 py-4 font-medium text-white">{item.name}</td><td className="px-5 py-4 text-slate-400">{formatCurrency(item.budget)}</td><td className="px-5 py-4 text-white font-bold">{item.paid ? formatCurrency(item.real) : '-'}</td><td className="px-5 py-4 text-xs">{item.paid ? <span className="bg-slate-700 px-2 py-1 rounded text-slate-200">{item.paidWith}</span> : '-'}</td><td className="px-5 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${item.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>{item.paid ? 'PAGADO' : 'PENDIENTE'}</span></td></tr>))}<tr className="bg-slate-800/90 font-bold border-t-2 border-slate-600 text-xs uppercase"><td className="px-5 py-4 text-white">TOTALES</td><td className="px-5 py-4 text-orange-400">{formatCurrency(totalBudgetFixed)}</td><td className="px-5 py-4 text-emerald-400">{formatCurrency(totalRealFixed)}</td><td colSpan="2"></td></tr></tbody></table>) : (<table className="w-full text-sm text-left"><thead className="text-xs text-slate-400 uppercase bg-slate-800/50"><tr><th className="px-6 py-4">Categoría</th><th className="px-6 py-4 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-700/50">{Object.keys(variableSummary).length === 0 ? (<tr><td colSpan="2" className="p-8 text-center text-slate-500">Sin movimientos.</td></tr>) : (Object.keys(variableSummary).map(cat => (<tr key={cat} className="hover:bg-slate-800/30"><td className="px-6 py-4 font-medium text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div>{cat}</td><td className="px-6 py-4 text-right font-bold text-slate-200">{formatCurrency(variableSummary[cat])}</td></tr>)))}</tbody></table>)}
        </div>
      </div>
      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/30 flex flex-col gap-4"><div className="flex justify-between items-center"><h3 className="font-bold text-slate-300">Movimientos Recientes</h3><span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{filteredHistory.length}</span></div><div className="relative"><Search className="absolute left-3 top-3 text-slate-500" size={16}/><input type="text" placeholder="Buscar..." className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-2 pl-10 text-sm text-white outline-none focus:border-purple-500" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div></div>
        <div className="divide-y divide-slate-700/50">
            {filteredHistory.slice(0, expandedHistory ? undefined : 5).map((t) => { 
                const isInc = t.type === 'income'; 
                return (
                    <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-800/30"><div className="flex items-center gap-4"><div className={`p-3 rounded-2xl ${isInc ? 'bg-emerald-500/10 text-emerald-400' : t.category==='Transferencia'?'bg-blue-500/10 text-blue-400':'bg-red-500/10 text-red-400'}`}>{t.category==='Transferencia' ? <ArrowRightLeft size={18}/> : isInc ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}</div><div><p className="font-bold text-white">{t.description}</p><p className="text-xs text-slate-500 mt-1">{t.date} • {t.category}</p></div></div><div className="flex items-center gap-4"><span className={`font-bold ${isInc ? 'text-emerald-400' : 'text-slate-200'}`}>{isInc?'+':'-'} {formatCurrency(t.amount)}</span><button onClick={()=>onDelete(t.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button></div></div>
                ) 
            })}
        </div>
        {filteredHistory.length > 5 && <button onClick={() => setExpandedHistory(!expandedHistory)} className="w-full p-4 text-center text-sm text-blue-400 font-medium border-t border-slate-700/50 hover:bg-slate-800/50 transition-colors">{expandedHistory ? "Ver menos" : "Ver todo"}</button>}
      </div>
    </div>
  );
};

const AnalysisSection = ({ 
    pieData, topExpenseCategory, incomeSpentPercentage, totalExpenses, realBalance, COLORS, 
    goalsList, deleteGoal, 
    newGoalName, setNewGoalName, newGoalTarget, setNewGoalTarget, newGoalCurrent, setNewGoalCurrent, addGoal 
}) => (
  <div className="max-w-7xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-xl">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BarChart3 className="text-purple-500"/> Análisis Mensual</h3>
      <div className="flex flex-col gap-6 items-center">
        <div className="w-full h-[300px]">{pieData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({name, value}) => `${name}: ${formatCurrency(value)}`}>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff'}} itemStyle={{color: '#fff'}}/></PieChart></ResponsiveContainer>) : (<div className="w-full h-full flex items-center justify-center border-4 border-slate-800 border-dashed rounded-[2rem] text-slate-500">Sin datos para mostrar</div>)}</div>
        <div className="w-full space-y-4">
            <div className={`p-5 rounded-3xl border flex items-center gap-4 ${realBalance >= 0 ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}><PiggyBank size={28} className={realBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}/><div><p className="text-xs font-bold uppercase text-slate-400 mb-0.5">Balance del Mes (Te queda libre)</p><p className={`text-2xl font-bold ${realBalance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatCurrency(realBalance)}</p></div></div>
            <div className="flex gap-4"><div className="flex-1 bg-slate-800 p-4 rounded-3xl border border-slate-700/50"><p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Mayor Gasto</p><p className="text-sm font-bold text-white truncate">{topExpenseCategory ? topExpenseCategory.name : '-'}</p><p className="text-xs text-slate-400">{topExpenseCategory ? formatCurrency(topExpenseCategory.value) : '$ 0'}</p></div><div className="flex-1 bg-slate-800 p-4 rounded-3xl border border-slate-700/50"><p className="text-slate-400 text-[10px] font-bold uppercase mb-1">Total Gastado</p><p className="text-sm font-bold text-white">{formatCurrency(totalExpenses)}</p><p className={`text-xs ${incomeSpentPercentage > 80 ? 'text-red-400' : 'text-emerald-400'}`}>{incomeSpentPercentage.toFixed(0)}% de Ingresos</p></div></div>
        </div>
      </div>
    </div>
    
    <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-slate-700 shadow-xl">
       <div className="flex justify-between items-center mb-6">
         <h3 className="text-xl font-bold text-white flex items-center gap-2"><Target className="text-blue-500"/> Metas y Deudas</h3>
       </div>
       
       {/* FORMULARIO DE METAS (Ahora directo en el componente) */}
       <div className="bg-slate-900 p-4 rounded-3xl mb-6">
          <div className="flex gap-2 mb-2">
             <input placeholder="Ej: Vacaciones" value={newGoalName} onChange={e=>setNewGoalName(e.target.value)} className="bg-transparent border-b border-slate-700 text-white w-full text-sm p-2 outline-none focus:border-blue-500"/>
             <input type="text" placeholder="Meta $" value={formatNumberString(newGoalTarget)} onChange={e=>setNewGoalTarget(e.target.value)} className="bg-transparent border-b border-slate-700 text-white w-24 text-sm p-2 outline-none focus:border-blue-500"/>
          </div>
          <div className="flex gap-2 items-center">
             <input type="text" placeholder="Ahorrado $" value={formatNumberString(newGoalCurrent)} onChange={e=>setNewGoalCurrent(e.target.value)} className="bg-slate-800 rounded-xl px-3 py-2 text-xs text-white w-full outline-none"/>
             <button onClick={addGoal} className="bg-blue-600 px-4 py-2 rounded-xl text-white text-xs font-bold">Crear</button>
          </div>
       </div>

       <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
         {goalsList.length === 0 ? <p className="text-center text-slate-500 text-sm py-10">No hay metas activas.</p> : goalsList.map((goal, i) => {
            const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const goalColor = COLORS[i % COLORS.length]; 
            return (
              <div key={goal.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                 <div className="flex justify-between items-start mb-2"><div><p className="font-bold text-white">{goal.name}</p><p className="text-[10px] text-slate-400">Meta: {formatCurrency(goal.target)}</p></div><button onClick={()=>deleteGoal(goal.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button></div>
                 <div className="flex justify-between items-center text-xs font-bold mb-1" style={{color: goalColor}}><span>{formatCurrency(goal.current)}</span><span>{percent}%</span></div>
                 <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden"><div className="h-full transition-all duration-700" style={{width: `${percent}%`, backgroundColor: goalColor}}></div></div>
              </div>
            )
         })}
       </div>
    </div>
  </div>
);

const AnnualModal = ({ isOpen, onClose, year, annualData, annualIncome, annualExpense, maxExpenseMonthData, topAnnualCat, topAnnualCatVal }) => {
  if (!isOpen) return null;
  return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#1e293b] w-full max-w-2xl rounded-[2.5rem] border border-slate-700 shadow-2xl relative p-8">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
          <h2 className="text-xl font-bold text-white mb-6">Balance Anual {year}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-900/20 p-4 rounded-3xl text-center border border-emerald-500/20"><p className="text-xs text-emerald-400 uppercase font-bold">Total Ingresos</p><p className="text-lg font-bold text-white">{formatCurrency(annualIncome)}</p></div>
            <div className="bg-red-900/20 p-4 rounded-3xl text-center border border-red-500/20"><p className="text-xs text-red-400 uppercase font-bold">Total Gastos</p><p className="text-lg font-bold text-white">{formatCurrency(annualExpense)}</p></div>
          </div>
          <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 mb-6">
             <div className="grid grid-cols-2 gap-4">
               <div><p className="text-[10px] text-slate-500">Mes con más Gasto</p><p className="text-white font-bold">{maxExpenseMonthData.name} ({formatCurrency(maxExpenseMonthData.Gas)})</p></div>
               <div><p className="text-[10px] text-slate-500">Mayor Gasto Anual (Categoría)</p><p className="text-white font-bold">{topAnnualCat} ({formatCurrency(topAnnualCatVal)})</p></div>
             </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={annualData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/><XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false}/><YAxis stroke="#94a3b8" axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/><Tooltip contentStyle={{backgroundColor:'#1e293b',border:'none',borderRadius:'12px'}}/><Bar dataKey="Ing" fill="#10b981" radius={[4,4,0,0]}/><Bar dataKey="Gas" fill="#ef4444" radius={[4,4,0,0]}/></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  );
}

const ConfigModal = ({ isOpen, onClose, mainGoal, updateMainGoal, appTitle, updateAppTitle, accounts, addAccount, deleteAccount, fixedExpensesList, addFixedExpense, deleteFixedExpense, resetAllData, goalOptions, newAccName, setNewAccName, newAccColor, setNewAccColor, newFixedName, setNewFixedName, newFixedBudget, setNewFixedBudget }) => {
    if(!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1e293b] w-full max-w-lg rounded-[2.5rem] p-6 relative max-h-[90vh] overflow-y-auto scrollbar-hide border border-slate-700 shadow-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full"><X size={20}/></button>
          <h2 className="text-xl font-bold text-white mb-6">Configuración</h2>
          
          <div className="space-y-6">
             <div className="bg-slate-900 p-5 rounded-3xl">
                <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Objetivo Financiero</label>
                <CustomSelect value={mainGoal} onChange={updateMainGoal} options={goalOptions} type="goal" />
             </div>
             <div className="bg-slate-900 p-5 rounded-3xl"><label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Nombre App</label><div className="flex gap-2"><input value={appTitle} onChange={e=>updateAppTitle(e.target.value)} className="bg-transparent border-b border-purple-500 text-white w-full outline-none"/><Edit2 size={16} className="text-purple-500"/></div></div>
             
             <div className="bg-slate-900 p-5 rounded-3xl">
                <h3 className="text-white font-bold mb-4">Cuentas</h3>
                <div className="flex gap-2 mb-4 items-center"><input placeholder="Nueva cuenta..." value={newAccName} onChange={e=>setNewAccName(e.target.value)} className="bg-slate-800 rounded-xl px-3 py-2 text-sm text-white w-full outline-none"/><input type="color" value={newAccColor} onChange={e=>setNewAccColor(e.target.value)} title="Color de la cuenta"/><button onClick={addAccount} className="bg-blue-600 p-2 rounded-xl text-white"><Plus size={18}/></button></div>
                <div className="space-y-2">{accounts.map(acc=><div key={acc.id} className="flex justify-between items-center p-2 bg-slate-800 rounded-xl text-white text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:acc.color}}></div><span>{acc.name}</span></div><Trash2 size={14} className="text-red-400 cursor-pointer" onClick={()=>deleteAccount(acc.id)} /></div>)}</div>
             </div>

             <div className="bg-slate-900 p-5 rounded-3xl">
                <h3 className="text-white font-bold mb-4">Gastos Fijos</h3>
                <div className="flex gap-2 mb-4 items-center"><input placeholder="Nombre..." value={newFixedName} onChange={e=>setNewFixedName(e.target.value)} className="bg-slate-800 rounded-xl px-3 py-2 text-sm text-white w-full outline-none"/><input placeholder="$$$" type="number" value={newFixedBudget} onChange={e=>setNewFixedBudget(e.target.value)} className="bg-slate-800 rounded-xl px-3 py-2 text-sm text-white w-20 outline-none text-center"/><button onClick={addFixedExpense} className="bg-orange-600 p-2 rounded-xl text-white"><Plus size={18}/></button></div>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">{fixedExpensesList.map(i=><div key={i.id} className="flex justify-between p-2 bg-slate-800 rounded-xl text-white text-sm"><span>{i.name} ({formatCurrency(i.budget)})</span><Trash2 size={14} className="text-red-400 cursor-pointer" onClick={()=>deleteFixedExpense(i.id)} /></div>)}</div>
             </div>
             
             <button onClick={resetAllData} className="w-full text-red-400 text-xs font-bold border border-red-900/50 hover:bg-red-900/20 py-3 rounded-2xl flex items-center justify-center gap-2 mt-4"><RefreshCw size={12}/> Reiniciar Valores de Fábrica</button>
          </div>
        </div>
      </div>
    );
}

// --- APP PRINCIPAL ---

const Toast = ({ message, type }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full z-[80] flex items-center gap-3 animate-in slide-in-from-top-4 fade-in shadow-2xl ${type === 'error' ? 'toast-error' : 'toast-visible'}`}>
      {type === 'error' ? <AlertOctagon size={18} /> : <CheckCircle size={18} />}
      <span className="font-bold text-sm tracking-wide">{message}</span>
    </div>
  );
};

const LoginScreen = ({ onLogin }) => (
  <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-purple-600 p-4 rounded-3xl shadow-2xl shadow-purple-900/50 mb-6 animate-in zoom-in duration-500"><Wallet size={64} className="text-white" /></div>
    <h1 className="text-3xl font-bold text-white mb-2">Finanzas Personales</h1>
    <p className="text-slate-400 mb-8 max-w-xs">Tu dinero, bajo control.</p>
    <button onClick={onLogin} className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 hover:scale-105 transition-transform shadow-xl"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="G" />Entrar con Google</button>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  useEffect(() => { const unsub = onAuthStateChanged(auth, (usr) => { setUser(usr); setLoading(false); }); return () => unsub(); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { alert(error.message); } };
  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-bold">Cargando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;
  return <Dashboard user={user} logout={() => signOut(auth)} />;
}

function Dashboard({ user, logout }) {
  // 1. FECHA AUTOMÁTICA REAL
  // Usa la fecha actual del sistema. Si es 2025, será 2025.
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  
  const [transactions, setTransactions] = useState([]);
  
  // CONFIG
  const [appTitle, setAppTitle] = useState('Finanzas Personales');
  const [mainGoal, setMainGoal] = useState('Ahorrar para una gran compra');
  const [goalsList, setGoalsList] = useState([]);
  const [fixedExpensesList, setFixedExpensesList] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // UI
  const [showConfig, setShowConfig] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const [activeTab, setActiveTab] = useState('fixed');
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ description: '', amount: '', type: 'expense', category: '', account: '', toAccount: '', date: '' });
  const [dialog, setDialog] = useState({ isOpen: false, title: '', msg: '', action: null, isDanger: false });

  // Config Inputs
  const [newAccName, setNewAccName] = useState('');
  const [newAccColor, setNewAccColor] = useState('#3b82f6');
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedBudget, setNewFixedBudget] = useState('');
  
  // Meta Inputs
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  // Añadimos 2025 por si acaso para pruebas, pero funcionará dinámicamente con lo que selecciones
  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#6366f1', '#14b8a6'];
  const goalOptions = ['Ahorrar para una gran compra', 'Pagar deudas', 'Crear fondo de emergencia', 'Invertir para el futuro', 'Presupuesto general', 'Aumentar ahorros'];

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3000); };

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const userSettingsRef = doc(db, "user_settings", user.uid);
    const unsub = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppTitle(data.appTitle || 'Finanzas Personales');
        setMainGoal(data.mainGoal || 'Ahorrar para una gran compra');
        setAccounts(data.accounts || []);
        setFixedExpensesList(data.fixedExpensesList || []);
        setGoalsList(data.goalsList || []);
      } else {
        const defaultAccounts = [{ id: 'bancolombia', name: 'Bancolombia', color: '#FCD34D' }, { id: 'nu', name: 'Nu', color: '#8B5CF6' }, { id: 'nequi', name: 'Nequi', color: '#EC4899' }, { id: 'efectivo', name: 'Efectivo', color: '#10B981' }];
        const defaultFixed = [{ id: 1, name: 'Arriendo / Hipoteca', budget: 0 }, { id: 2, name: 'Administración', budget: 0 }, { id: 3, name: 'Luz', budget: 0 }, { id: 4, name: 'Agua', budget: 0 }, { id: 5, name: 'Gas', budget: 0 }, { id: 6, name: 'Internet / TV', budget: 0 }, { id: 7, name: 'Plan Celular', budget: 0 }, { id: 8, name: 'Transporte Fijo', budget: 0 }, { id: 9, name: 'Suscripciones', budget: 0 }];
        setDoc(userSettingsRef, { appTitle: 'Finanzas Personales', mainGoal: 'Ahorrar', accounts: defaultAccounts, fixedExpensesList: defaultFixed, goalsList: [] });
      }
    });
    return () => unsub();
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => { const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); data.sort((a, b) => b.date.localeCompare(a.date)); setTransactions(data); });
    return () => unsub();
  }, [user.uid]);

  const saveSettingsToFirebase = async (updates) => { try { await setDoc(doc(db, "user_settings", user.uid), updates, { merge: true }); } catch (e) { console.error(e); } };

  // --- ACTIONS CONFIG ---
  const updateAppTitle = (val) => { setAppTitle(val); saveSettingsToFirebase({ appTitle: val }); };
  const updateMainGoal = (val) => { setMainGoal(val); saveSettingsToFirebase({ mainGoal: val }); };
  const addAccount = () => { if(!newAccName) return; const newId = newAccName.toLowerCase().replace(/\s+/g, '') + Date.now(); const newAccs = [...accounts, { id: newId, name: newAccName, color: newAccColor }]; saveSettingsToFirebase({ accounts: newAccs }); setNewAccName(''); setNewAccColor('#3b82f6'); };
  const deleteAccount = (id) => { const newAccs = accounts.filter(a => a.id !== id); saveSettingsToFirebase({ accounts: newAccs }); };
  const addFixedExpense = () => { if(!newFixedName || !newFixedBudget) return; const newFixed = [...fixedExpensesList, { id: Date.now(), name: newFixedName, budget: Number(newFixedBudget) }]; saveSettingsToFirebase({ fixedExpensesList: newFixed }); setNewFixedName(''); setNewFixedBudget(''); };
  const deleteFixedExpense = (id) => { const newFixed = fixedExpensesList.filter(x => x.id !== id); saveSettingsToFirebase({ fixedExpensesList: newFixed }); };

  // --- LOGICA METAS ---
  const addGoal = () => {
    const targetVal = parseNumberString(newGoalTarget); const currentVal = parseNumberString(newGoalCurrent);
    if(!newGoalName || targetVal <= 0) return;
    const newGoals = [...goalsList, { id: Date.now(), name: newGoalName, target: targetVal, current: currentVal }];
    saveSettingsToFirebase({ goalsList: newGoals });
    setNewGoalName(''); setNewGoalTarget(''); setNewGoalCurrent('');
  };
  const deleteGoal = (id) => { const newGoals = goalsList.filter(g => g.id !== id); saveSettingsToFirebase({ goalsList: newGoals }); };

  // --- LOGICA NEGOCIO ---
  const openConfirm = (title, msg, action, isDanger = false) => { setDialog({ isOpen: true, title, msg, action, isDanger }); };
  const closeConfirm = () => setDialog({ ...dialog, isOpen: false });
  const executeConfirm = () => { if(dialog.action) dialog.action(); closeConfirm(); };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return showToast("Monto inválido", "error");
    if (!formData.account && accounts.length > 0) setFormData(prev => ({ ...prev, account: accounts[0].id }));
    if (formData.type !== 'transfer' && !formData.category) return showToast("Selecciona una categoría", "error");
    if (formData.type === 'transfer' && !formData.toAccount) return showToast("Selecciona cuenta destino", "error");

    const selectedAccount = formData.account || accounts[0]?.id;
    const finalDate = formData.date || new Date().toISOString().split('T')[0];
    const [regY, regM] = finalDate.split('-');
    setSelYear(Number(regY));
    setSelMonth(Number(regM) - 1);
    const categoryToSave = formData.category || 'Otros';

    try {
      const baseData = { uid: user.uid, createdAt: new Date() };
      if (formData.type === 'transfer') {
        const tBase = { ...baseData, amount: Number(formData.amount), category: 'Transferencia', date: finalDate, isTransfer: true };
        await addDoc(collection(db, "transactions"), { ...tBase, description: `Transf. a ${accounts.find(a=>a.id===formData.toAccount)?.name}`, type: 'expense', account: formData.account });
        await addDoc(collection(db, "transactions"), { ...tBase, description: `Recibido de ${accounts.find(a=>a.id===formData.account)?.name}`, type: 'income', account: formData.toAccount });
      } else { 
        await addDoc(collection(db, "transactions"), { ...formData, ...baseData, category: categoryToSave, account: selectedAccount, amount: Number(formData.amount), date: finalDate }); 
      }
      setFormData(prev => ({ ...prev, description: '', amount: '' })); 
      showToast("¡Registrado!"); 
    } catch (e) { showToast(e.message, "error"); }
  };
  
  const deleteTransaction = async (id) => { await deleteDoc(doc(db, "transactions", id)); };
  
  // 2. REINICIO SUAVE (SIN RECARGA)
  const resetAllData = async () => {
    showToast("Eliminando...", "error");
    try {
      const batch = writeBatch(db);
      const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => { batch.delete(doc.ref); });
      await batch.commit();
      
      // Borrar settings dispara el listener de useEffect, recargando los datos por defecto automáticamente
      await deleteDoc(doc(db, "user_settings", user.uid));
      
      showToast("¡Cuenta Reiniciada!");
      // NO HAY window.location.reload() AQUÍ
      setShowConfig(false);
    } catch (e) { showToast(e.message, "error"); }
  };

  // --- CÁLCULOS (MEMOIZED) ---
  const monthlyTrans = useMemo(() => transactions.filter(t => { const tDate = getDateObject(t.date); return tDate.getMonth() === selMonth && tDate.getFullYear() === selYear; }), [transactions, selMonth, selYear]);
  const totalIncome = useMemo(() => monthlyTrans.filter(t => t.type === 'income' && !t.isTransfer).reduce((a, t) => a + t.amount, 0), [monthlyTrans]);
  const totalExpenses = useMemo(() => monthlyTrans.filter(t => t.type === 'expense' && !t.isTransfer).reduce((a, t) => a + t.amount, 0), [monthlyTrans]);
  
  const variableTrans = useMemo(() => { const fixedNames = fixedExpensesList.map(i => i.name); return monthlyTrans.filter(t => t.type === 'expense' && !t.isTransfer && !fixedNames.includes(t.category)); }, [monthlyTrans, fixedExpensesList]);
  const totalVariable = useMemo(() => variableTrans.reduce((a, t) => a + t.amount, 0), [variableTrans]);
  
  const fixedStatus = useMemo(() => fixedExpensesList.map(i => { const t = monthlyTrans.find(tr => tr.type === 'expense' && tr.category === i.name); return { ...i, real: t ? t.amount : 0, paid: !!t, paidWith: t ? accounts.find(a=>a.id===t.account)?.name : '-' }; }), [fixedExpensesList, monthlyTrans, accounts]);
  const totalBudgetFixed = useMemo(() => fixedStatus.reduce((a,i) => a + i.budget, 0), [fixedStatus]); 
  const totalRealFixed = useMemo(() => fixedStatus.reduce((a,i) => a + i.real, 0), [fixedStatus]); 
  const pendingFixed = useMemo(() => fixedStatus.filter(i=>!i.paid).reduce((a,i)=>a+i.budget, 0), [fixedStatus]);
  
  const realBalance = totalIncome - totalExpenses;
  const virtualAvailable = Math.max(0, realBalance - pendingFixed);
  const fixedProgress = totalBudgetFixed > 0 ? (totalRealFixed / totalBudgetFixed) * 100 : 0;
  
  const pieData = useMemo(() => { const allExpensesSummary = monthlyTrans.filter(t => t.type === 'expense' && !t.isTransfer).reduce((acc, curr) => { acc[curr.category] = (acc[curr.category] || 0) + curr.amount; return acc; }, {}); return Object.keys(allExpensesSummary).map(k => ({ name: k, value: allExpensesSummary[k] })).sort((a, b) => b.value - a.value); }, [monthlyTrans]);
  const variableSummary = useMemo(() => variableTrans.reduce((acc, curr) => { acc[curr.category] = (acc[curr.category] || 0) + curr.amount; return acc; }, {}), [variableTrans]);
  const topExpenseCategory = pieData.length > 0 ? pieData[0] : null;
  const incomeSpentPercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  
  // ANNUAL DATA
  const annualData = useMemo(() => { const annualT = transactions.filter(t => { const [tY] = t.date.split('-').map(Number); return tY === selYear; }); return Array.from({length: 12}, (_, i) => { const mt = annualT.filter(t => Number(t.date.split('-')[1]) === (i + 1)); return { name: months[i].substring(0,3), Ing: mt.filter(t=>t.type==='income').reduce((a,c)=>a+c.amount,0), Gas: mt.filter(t=>t.type==='expense').reduce((a,c)=>a+c.amount,0) }; }); }, [transactions, selYear]);
  const annualIncome = useMemo(() => annualData.reduce((a,b)=>a+b.Ing,0), [annualData]); 
  const annualExpense = useMemo(() => annualData.reduce((a,b)=>a+b.Gas,0), [annualData]);
  const maxExpenseMonthData = useMemo(() => annualData.reduce((prev, current) => (prev.Gas > current.Gas) ? prev : current, {name: '-', Gas: 0}), [annualData]);
  const annualCatSummary = useMemo(() => { const annualT = transactions.filter(t => { const [tY] = t.date.split('-').map(Number); return tY === selYear; }); return annualT.filter(t => t.type === 'expense' && !t.isTransfer).reduce((acc, curr) => { acc[curr.category] = (acc[curr.category] || 0) + curr.amount; return acc; }, {}); }, [transactions, selYear]);
  const topAnnualCat = Object.keys(annualCatSummary).sort((a,b) => annualCatSummary[b] - annualCatSummary[a])[0] || 'Ninguna';
  const topAnnualCatVal = annualCatSummary[topAnnualCat] || 0;

  const filteredHistory = useMemo(() => monthlyTrans.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase())), [monthlyTrans, searchTerm]);

  const copyAIContext = () => {
    const context = `Actúa como Asesor. Objetivo: ${mainGoal}. DATOS ${months[selMonth]} ${selYear}: Ingresos ${formatCurrency(totalIncome)}, Gastos ${formatCurrency(totalExpenses)}, Libre ${formatCurrency(realBalance)}.`;
    navigator.clipboard.writeText(context);
    showToast("✅ Copiado para IA");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans pb-32">
      <GlobalStyles />
      <Toast message={toast.msg} type={toast.type} />
      <ConfirmDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.msg} onConfirm={executeConfirm} onCancel={closeConfirm} isDanger={dialog.isDanger} />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3"><div className="bg-gradient-to-br from-purple-600 to-blue-600 p-2.5 rounded-2xl shadow-lg"><Wallet className="text-white" /></div><div><span>{appTitle}</span><span className="block text-[10px] text-slate-500 uppercase tracking-widest font-normal">Plan Premium</span></div></h1>
          <div className="flex gap-2"><div className="w-full md:w-40"><CustomSelect value={selMonth} onChange={setSelMonth} options={months} type="month" /></div><div className="w-32"><CustomSelect value={selYear} onChange={setSelYear} options={years} type="year" /></div><button onClick={() => setShowAnnual(true)} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 text-blue-400 border border-slate-700"><Calendar size={20}/></button><button onClick={() => setShowConfig(true)} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 text-slate-300 border border-slate-700"><Settings size={20} /></button><button onClick={logout} className="p-3 bg-slate-800 rounded-2xl hover:bg-red-900/50 text-red-400 border border-slate-700"><LogOut size={20} /></button></div>
        </div>

        <AccountsPanel accounts={accounts} transactions={transactions} />
        <KpiCards totalIncome={totalIncome} totalExpenses={totalExpenses} totalVariable={totalVariable} virtualAvailable={virtualAvailable} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <TransactionForm formData={formData} setFormData={setFormData} onSave={handleTransaction} accounts={accounts} fixedNames={fixedExpensesList.map(i=>i.name)} mainGoal={mainGoal} copyAIContext={copyAIContext} />
          </div>
          <ExpensesAndHistory activeTab={activeTab} setActiveTab={setActiveTab} fixedProgress={fixedProgress} fixedStatus={fixedStatus} variableSummary={variableSummary} totalBudgetFixed={totalBudgetFixed} totalRealFixed={totalRealFixed} filteredHistory={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} onDelete={(id)=>openConfirm("Eliminar", "¿Borrar este movimiento?", ()=>deleteTransaction(id), true)} />
        </div>

        <AnalysisSection 
            pieData={pieData} topExpenseCategory={topExpenseCategory} incomeSpentPercentage={incomeSpentPercentage} totalExpenses={totalExpenses} realBalance={realBalance} COLORS={COLORS} 
            goalsList={goalsList} deleteGoal={(id)=>openConfirm("Eliminar", "¿Borrar meta?", ()=>deleteGoal(id), true)}
            newGoalName={newGoalName} setNewGoalName={setNewGoalName}
            newGoalTarget={newGoalTarget} setNewGoalTarget={setNewGoalTarget}
            newGoalCurrent={newGoalCurrent} setNewGoalCurrent={setNewGoalCurrent}
            addGoal={addGoal}
        />
      </div>

      <AnnualModal isOpen={showAnnual} onClose={() => setShowAnnual(false)} year={selYear} annualData={annualData} annualIncome={annualIncome} annualExpense={annualExpense} maxExpenseMonthData={maxExpenseMonthData} topAnnualCat={topAnnualCat} topAnnualCatVal={topAnnualCatVal} />
      
      <ConfigModal 
        isOpen={showConfig} onClose={() => setShowConfig(false)}
        mainGoal={mainGoal} updateMainGoal={updateMainGoal}
        appTitle={appTitle} updateAppTitle={updateAppTitle}
        accounts={accounts} addAccount={addAccount} deleteAccount={(id)=>openConfirm("Borrar Cuenta", "¿Seguro? Esto no borra los movimientos asociados.", ()=>deleteAccount(id), true)}
        fixedExpensesList={fixedExpensesList} addFixedExpense={addFixedExpense} deleteFixedExpense={(id)=>openConfirm("Borrar Gasto Fijo", "¿Seguro?", ()=>deleteFixedExpense(id), true)}
        resetAllData={()=>openConfirm("Reiniciar Datos", "Se borrará TODO (movimientos y config). Volverá a estado de fábrica.", resetAllData, true)}
        goalOptions={goalOptions}
        newAccName={newAccName} setNewAccName={setNewAccName} newAccColor={newAccColor} setNewAccColor={setNewAccColor}
        newFixedName={newFixedName} setNewFixedName={setNewFixedName} newFixedBudget={newFixedBudget} setNewFixedBudget={setNewFixedBudget}
      />
    </div>
  );
}