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
    input[type="color"] { -webkit-appearance: none; border: none; width: 24px; height: 24px; border-radius: 50%; overflow: hidden; cursor: pointer; padding: 0; background: none; }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 50%; border: 2px solid #334155; }
    input[type="date"] { color-scheme: dark; cursor: pointer; }
    .recharts-text { fill: #94a3b8 !important; font-size: 10px; font-weight: bold; }
  `}</style>
);

// --- UTILIDADES ---
const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0);
const formatNumberString = (val) => val ? new Intl.NumberFormat('es-CO').format(val.replace(/\D/g, '')) : '';
const parseNumberString = (val) => val ? Number(val.replace(/\./g, '')) : 0;
const getDateObject = (dateString) => new Date(dateString + 'T00:00:00');

// --- COMPONENTES ---
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, isDanger }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] w-full max-w-xs rounded-2xl border border-slate-700 shadow-2xl p-5 text-center">
        <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isDanger ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
          {isDanger ? <AlertOctagon size={20}/> : <CheckCircle size={20}/>}
        </div>
        <h3 className="text-base font-bold text-white mb-1">{title}</h3>
        <p className="text-slate-400 text-xs mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs">Cancelar</button>
          <button onClick={onConfirm} className={`flex-1 py-2 rounded-xl font-bold text-xs text-white ${isDanger ? 'bg-red-600' : 'bg-blue-600'}`}>Si</button>
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
      {label && <span className="text-[10px] text-slate-500 font-bold ml-1 mb-0.5 block uppercase">{label}</span>}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-left text-white flex justify-between items-center outline-none active:bg-slate-800 transition-colors">
        <span className={`font-bold text-xs truncate ${!value ? 'text-slate-500' : ''}`}>{displayLabel || "Seleccionar"}</span>
        <ChevronDown size={14} className={`transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`}/>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-20 w-full mt-1 bg-[#1e293b] border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto scrollbar-hide p-1">
            {type === 'category' ? (
               options.map((grp, i) => (<div key={i}><div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 mt-1 ${grp.color}`}>{grp.label}</div>{grp.items.map(c => (<div key={c} onClick={() => { onChange(c); setIsOpen(false); }} className="p-2 hover:bg-slate-700 rounded-lg cursor-pointer text-white text-xs font-medium ml-1">{c}</div>))}</div>))
            ) : type === 'account' ? (
              options.map(acc => (<div key={acc.id} onClick={() => { onChange(acc.id); setIsOpen(false); }} className="p-2 hover:bg-slate-700 rounded-lg cursor-pointer text-white flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: acc.color}}></div><span className="text-xs font-medium">{acc.name}</span></div>))
            ) : type === 'month' ? (
              options.map((m, i) => (<div key={i} onClick={() => { onChange(i); setIsOpen(false); }} className={`p-2 rounded-lg cursor-pointer text-xs font-bold text-center ${value === i ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{m}</div>))
            ) : ( options.map(opt => (<div key={opt} onClick={() => { onChange(opt); setIsOpen(false); }} className={`p-2 rounded-lg cursor-pointer text-xs font-bold text-left ${value === opt ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{opt}</div>))
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
    <div className="relative w-full bg-slate-900 border border-slate-700 rounded-xl flex items-center px-3 py-2.5 focus-within:border-purple-500 transition-colors">
      <span className="text-slate-400 mr-1 font-bold text-sm">$</span>
      <input type="text" value={display} onChange={handleChange} placeholder={placeholder} className="bg-transparent text-white w-full outline-none font-bold text-sm placeholder-slate-600"/>
    </div>
  );
};

const AccountsPanel = ({ accounts, transactions }) => {
  // GRID 2x2 para móvil (se ve todo de un vistazo)
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
      {accounts.map(acc => {
        const income = transactions.filter(t => t.type === 'income' && t.account === acc.id).reduce((a, t) => a + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense' && t.account === acc.id).reduce((a, t) => a + t.amount, 0);
        const balance = income - expense;
        return (
          <div key={acc.id} className="bg-[#1e293b] p-3 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-between h-20">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: acc.color}}></div><span className="text-[10px] text-slate-400 font-bold uppercase truncate">{acc.name}</span></div>
            <p className="text-sm font-bold text-white truncate">{formatCurrency(balance)}</p>
          </div>
        );
      })}
    </div>
  );
};

const KpiCards = ({ totalIncome, totalExpenses, totalVariable, virtualAvailable }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
    <div className="bg-emerald-900/10 p-3 rounded-2xl border border-emerald-500/20"><p className="text-emerald-400 text-[9px] uppercase font-bold mb-0.5">Ingresos</p><p className="text-sm font-bold text-emerald-300 truncate">{formatCurrency(totalIncome)}</p></div>
    <div className="bg-red-900/10 p-3 rounded-2xl border border-red-500/20"><p className="text-red-400 text-[9px] uppercase font-bold mb-0.5">Gastos</p><p className="text-sm font-bold text-red-300 truncate">{formatCurrency(totalExpenses)}</p></div>
    <div className="bg-blue-900/10 p-3 rounded-2xl border border-blue-500/20"><p className="text-blue-400 text-[9px] uppercase font-bold mb-0.5">Variables</p><p className="text-sm font-bold text-blue-300 truncate">{formatCurrency(totalVariable)}</p></div>
    <div className={`p-3 rounded-2xl border shadow-lg ${virtualAvailable > 0 ? 'bg-emerald-600 border-emerald-500' : 'bg-[#1e293b] border-slate-700'}`}>
      <div><p className={`text-[9px] uppercase font-bold mb-0.5 ${virtualAvailable > 0 ? 'text-white/80' : 'text-slate-500'}`}>Disponible</p><p className={`text-base font-bold truncate ${virtualAvailable > 0 ? 'text-white' : 'text-slate-500'}`}>{formatCurrency(virtualAvailable)}</p></div>
    </div>
  </div>
);

const TransactionForm = ({ formData, setFormData, onSave, accounts, fixedNames, mainGoal, copyAIContext }) => {
  return (
    <div className="bg-[#1e293b] p-4 rounded-[2rem] border border-slate-700 shadow-xl space-y-4 lg:sticky lg:top-6">
      <div onClick={copyAIContext} className="bg-slate-800/50 border border-slate-700 p-2.5 rounded-xl cursor-pointer flex items-center justify-between group">
          <div className="flex items-center gap-2"><div className="bg-purple-600 p-1 rounded-lg text-white"><Brain size={14}/></div><p className="text-[10px] font-bold text-white">Consultar IA</p></div><Copy size={12} className="text-slate-400"/>
      </div>
      <div>
        <div className="flex bg-slate-900 p-1 rounded-xl mb-3">{['income', 'expense', 'transfer'].map(type => (<button key={type} onClick={() => setFormData({...formData, type, category: ''})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold capitalize transition-all ${formData.type === type ? (type === 'income' ? 'bg-emerald-600' : type === 'expense' ? 'bg-red-600' : 'bg-blue-600') + ' text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{type === 'income' ? 'Ingreso' : type === 'expense' ? 'Gasto' : 'Transf.'}</button>))}</div>
        <form onSubmit={onSave} className="space-y-2.5">
          {formData.type === 'transfer' ? (<div className="grid grid-cols-2 gap-2"><CustomSelect value={formData.account} onChange={v=>setFormData({...formData, account: v})} options={accounts} type="account" label="Desde" /><CustomSelect value={formData.toAccount} onChange={v=>setFormData({...formData, toAccount: v})} options={accounts} type="account" label="Para" /></div>) : (<div className="grid grid-cols-2 gap-1.5">{accounts.slice(0,4).map(acc => ( <button type="button" key={acc.id} onClick={() => setFormData({...formData, account: acc.id})} className={`py-2 px-1 rounded-lg text-[10px] font-bold transition-all border ${formData.account === acc.id || (!formData.account && acc.id === accounts[0].id) ? `${acc.color} border-current text-white bg-slate-800` : 'bg-slate-800 border-transparent text-slate-400'}`} style={(formData.account === acc.id || (!formData.account && acc.id === accounts[0].id)) ? { color: acc.color } : {}}>{acc.name}</button> ))}</div>)}
          <MoneyInput value={formData.amount} onChange={(v)=>setFormData({...formData, amount: v})} placeholder="Monto" />
          {formData.type !== 'transfer' && (<><input type="text" placeholder="Descripción" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-purple-500" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /><CustomSelect value={formData.category} onChange={c=>setFormData({...formData, category: c})} options={formData.type === 'income' ? [{label:'Ingresos', color:'text-emerald-400', items:['Salario', 'Negocios', 'Venta', 'Otros']}] : [{label:'Gastos Fijos', color:'text-orange-400', items: fixedNames},{label:'Gastos Variables', color:'text-blue-400', items: ['Alimentación', 'Transporte', 'Vivienda Extra', 'Salud', 'Educación', 'Diversión', 'Otros']}]} type="category" /></>)}
          <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-purple-500 font-bold"/>
          <button type="submit" className={`w-full font-bold py-3 rounded-xl shadow-lg active:scale-95 ${formData.type === 'income' ? 'bg-emerald-600' : formData.type === 'expense' ? 'bg-red-600' : 'bg-blue-600'} text-white text-sm`}>Guardar</button>
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
    <div className="lg:col-span-2 space-y-4">
      <div className="bg-[#1e293b] rounded-[2rem] border border-slate-700 shadow-xl overflow-hidden min-h-[250px]">
        <div className="flex border-b border-slate-700"><button onClick={() => setActiveTab('fixed')} className={`flex-1 py-2.5 font-bold text-[10px] md:text-xs transition-colors ${activeTab === 'fixed' ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-400' : 'text-slate-500'}`}>GASTOS FIJOS</button><button onClick={() => setActiveTab('variable')} className={`flex-1 py-2.5 font-bold text-[10px] md:text-xs transition-colors ${activeTab === 'variable' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}>VARIABLES</button></div>
        {activeTab === 'fixed' && (<div className="px-3 pt-3 pb-1"><div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1 uppercase"><span>Progreso</span><span>{Math.round(fixedProgress)}%</span></div><div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${fixedProgress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{width: `${fixedProgress}%`}}></div></div></div>)}
        <div className="overflow-x-auto scrollbar-hide">
          {activeTab === 'fixed' ? (<table className="w-full text-xs text-left"><thead className="text-[9px] text-slate-400 uppercase bg-slate-800/50"><tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">Presup.</th><th className="px-3 py-2">Real</th><th className="px-3 py-2 text-center">Ok</th></tr></thead><tbody className="divide-y divide-slate-700/50">{fixedStatus.map((item) => (<tr key={item.id} className="hover:bg-slate-800/30"><td className="px-3 py-2 font-medium text-white truncate max-w-[80px]">{item.name}</td><td className="px-3 py-2 text-slate-400">{formatCurrency(item.budget)}</td><td className="px-3 py-2 text-white font-bold">{item.paid ? formatCurrency(item.real) : '-'}</td><td className="px-3 py-2 text-center"><div className={`w-1.5 h-1.5 rounded-full mx-auto ${item.paid ? 'bg-emerald-500' : 'bg-orange-500'}`}></div></td></tr>))}<tr className="bg-slate-800/90 font-bold border-t-2 border-slate-600 text-[9px] uppercase"><td className="px-3 py-2 text-white">TOTAL</td><td className="px-3 py-2 text-orange-400">{formatCurrency(totalBudgetFixed)}</td><td className="px-3 py-2 text-emerald-400">{formatCurrency(totalRealFixed)}</td><td></td></tr></tbody></table>) : (<table className="w-full text-xs text-left"><thead className="text-[9px] text-slate-400 uppercase bg-slate-800/50"><tr><th className="px-3 py-2">Categoría</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-700/50">{Object.keys(variableSummary).length === 0 ? (<tr><td colSpan="2" className="p-4 text-center text-[10px] text-slate-500">Sin datos.</td></tr>) : (Object.keys(variableSummary).map(cat => (<tr key={cat} className="hover:bg-slate-800/30"><td className="px-3 py-2 font-medium text-white flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>{cat}</td><td className="px-3 py-2 text-right font-bold text-slate-200">{formatCurrency(variableSummary[cat])}</td></tr>)))}</tbody></table>)}
        </div>
      </div>
      <div className="bg-[#1e293b] rounded-[2rem] border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-3 border-b border-slate-700 bg-slate-800/30 flex flex-col gap-2"><div className="flex justify-between items-center"><h3 className="font-bold text-slate-300 text-xs">Movimientos</h3><span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{filteredHistory.length}</span></div><div className="relative"><Search className="absolute left-3 top-2 text-slate-500" size={12}/><input type="text" placeholder="Buscar..." className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 text-[10px] text-white outline-none focus:border-purple-500" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div></div>
        <div className="divide-y divide-slate-700/50">
            {filteredHistory.slice(0, expandedHistory ? undefined : 5).map((t) => { 
                const isInc = t.type === 'income'; 
                return (
                    <div key={t.id} className="p-3 flex justify-between items-center hover:bg-slate-800/30"><div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${isInc ? 'bg-emerald-500/10 text-emerald-400' : t.category==='Transferencia'?'bg-blue-500/10 text-blue-400':'bg-red-500/10 text-red-400'}`}>{t.category==='Transferencia' ? <ArrowRightLeft size={14}/> : isInc ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}</div><div className="overflow-hidden"><p className="font-bold text-white text-[10px] truncate max-w-[100px]">{t.description}</p><p className="text-[9px] text-slate-500">{t.date}</p></div></div><div className="flex items-center gap-2"><span className={`font-bold text-[10px] ${isInc ? 'text-emerald-400' : 'text-slate-200'}`}>{isInc?'+':'-'} {formatCurrency(t.amount)}</span><button onClick={()=>onDelete(t.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={12}/></button></div></div>
                ) 
            })}
        </div>
        {filteredHistory.length > 5 && <button onClick={() => setExpandedHistory(!expandedHistory)} className="w-full p-2.5 text-center text-[10px] text-blue-400 font-medium border-t border-slate-700/50">{expandedHistory ? "Menos" : "Ver todo"}</button>}
      </div>
    </div>
  );
};

const AnalysisSection = ({ 
    pieData, topExpenseCategory, incomeSpentPercentage, totalExpenses, realBalance, COLORS, 
    goalsList, deleteGoal, 
    newGoalName, setNewGoalName, newGoalTarget, setNewGoalTarget, newGoalCurrent, setNewGoalCurrent, addGoal 
}) => (
  <div className="max-w-7xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="bg-[#1e293b] p-4 rounded-[2rem] border border-slate-700 shadow-xl">
      <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><BarChart3 size={14} className="text-purple-500"/> Análisis</h3>
      <div className="flex flex-col gap-3 items-center">
        <div className="w-full h-[180px]">{pieData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" label={false}>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '10px'}} itemStyle={{color: '#fff'}}/></PieChart></ResponsiveContainer>) : (<div className="w-full h-full flex items-center justify-center border border-slate-800 border-dashed rounded-xl text-[10px] text-slate-500">Sin datos</div>)}</div>
        <div className="w-full space-y-2">
            <div className={`p-3 rounded-xl border flex items-center gap-3 ${realBalance >= 0 ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}><PiggyBank size={20} className={realBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}/><div><p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Libre</p><p className={`text-lg font-bold ${realBalance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{formatCurrency(realBalance)}</p></div></div>
        </div>
      </div>
    </div>
    
    <div className="bg-[#1e293b] p-4 rounded-[2rem] border border-slate-700 shadow-xl">
       <div className="flex justify-between items-center mb-3">
         <h3 className="text-xs font-bold text-white flex items-center gap-2"><Target size={14} className="text-blue-500"/> Metas</h3>
       </div>
       <div className="bg-slate-900 p-2 rounded-xl mb-3">
          <div className="flex gap-2 mb-2">
             <input placeholder="Nombre" value={newGoalName} onChange={e=>setNewGoalName(e.target.value)} className="bg-transparent border-b border-slate-700 text-white w-full text-[10px] p-1.5 outline-none focus:border-blue-500"/>
             <input type="text" placeholder="Meta $" value={formatNumberString(newGoalTarget)} onChange={e=>setNewGoalTarget(e.target.value)} className="bg-transparent border-b border-slate-700 text-white w-16 text-[10px] p-1.5 outline-none focus:border-blue-500"/>
          </div>
          <div className="flex gap-2 items-center">
             <input type="text" placeholder="Ahorrado $" value={formatNumberString(newGoalCurrent)} onChange={e=>setNewGoalCurrent(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white w-full outline-none"/>
             <button onClick={addGoal} className="bg-blue-600 px-3 py-1.5 rounded-lg text-white text-[10px] font-bold">Crear</button>
          </div>
       </div>
       <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
         {goalsList.map((goal, i) => {
            const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const goalColor = COLORS[i % COLORS.length]; 
            return (
              <div key={goal.id} className="bg-slate-800/50 p-2 rounded-xl border border-slate-700">
                 <div className="flex justify-between items-start mb-1"><div><p className="font-bold text-white text-[10px]">{goal.name}</p></div><button onClick={()=>deleteGoal(goal.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={10}/></button></div>
                 <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden"><div className="h-full transition-all duration-700" style={{width: `${percent}%`, backgroundColor: goalColor}}></div></div>
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
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1e293b] w-full max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl relative p-5">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full text-slate-400"><X size={16}/></button>
          <h2 className="text-base font-bold text-white mb-3">Balance {year}</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-emerald-900/20 p-2 rounded-xl text-center border border-emerald-500/20"><p className="text-[9px] text-emerald-400 uppercase font-bold">Ingresos</p><p className="text-sm font-bold text-white">{formatCurrency(annualIncome)}</p></div>
            <div className="bg-red-900/20 p-2 rounded-xl text-center border border-red-500/20"><p className="text-[9px] text-red-400 uppercase font-bold">Gastos</p><p className="text-sm font-bold text-white">{formatCurrency(annualExpense)}</p></div>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <BarChart data={annualData}><CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/><XAxis dataKey="name" stroke="#94a3b8" axisLine={false} tickLine={false} tick={{fontSize: 9}}/><Tooltip contentStyle={{backgroundColor:'#1e293b',border:'none',borderRadius:'8px', fontSize:'10px'}}/><Bar dataKey="Ing" fill="#10b981" radius={[2,2,0,0]}/><Bar dataKey="Gas" fill="#ef4444" radius={[2,2,0,0]}/></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  );
}

const ConfigModal = ({ isOpen, onClose, mainGoal, updateMainGoal, appTitle, updateAppTitle, accounts, addAccount, deleteAccount, fixedExpensesList, addFixedExpense, deleteFixedExpense, resetAllData, goalOptions, newAccName, setNewAccName, newAccColor, setNewAccColor, newFixedName, setNewFixedName, newFixedBudget, setNewFixedBudget }) => {
    if(!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
        <div className="bg-[#1e293b] w-full max-w-sm rounded-[2rem] p-5 relative max-h-[80vh] overflow-y-auto scrollbar-hide border border-slate-700 shadow-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-slate-800 rounded-full"><X size={16}/></button>
          <h2 className="text-base font-bold text-white mb-3">Ajustes</h2>
          
          <div className="space-y-3">
             <div className="bg-slate-900 p-3 rounded-xl">
                <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Objetivo</label>
                <CustomSelect value={mainGoal} onChange={updateMainGoal} options={goalOptions} type="goal" />
             </div>
             <div className="bg-slate-900 p-3 rounded-xl"><label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Título</label><input value={appTitle} onChange={e=>updateAppTitle(e.target.value)} className="bg-transparent border-b border-purple-500 text-white w-full outline-none text-xs pb-1"/></div>
             
             <div className="bg-slate-900 p-3 rounded-xl">
                <h3 className="text-white text-xs font-bold mb-2">Cuentas</h3>
                <div className="flex gap-2 mb-2 items-center"><input placeholder="Nombre" value={newAccName} onChange={e=>setNewAccName(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white w-full outline-none"/><input type="color" value={newAccColor} onChange={e=>setNewAccColor(e.target.value)}/><button onClick={addAccount} className="bg-blue-600 p-1.5 rounded-lg text-white"><Plus size={14}/></button></div>
                <div className="space-y-1">{accounts.map(acc=><div key={acc.id} className="flex justify-between items-center p-1.5 bg-slate-800 rounded-lg text-white text-[10px]"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:acc.color}}></div><span>{acc.name}</span></div><Trash2 size={10} className="text-red-400 cursor-pointer" onClick={()=>deleteAccount(acc.id)} /></div>)}</div>
             </div>

             <div className="bg-slate-900 p-3 rounded-xl">
                <h3 className="text-white text-xs font-bold mb-2">Fijos</h3>
                <div className="flex gap-2 mb-2 items-center"><input placeholder="Nombre" value={newFixedName} onChange={e=>setNewFixedName(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white w-full outline-none"/><input placeholder="$" type="number" value={newFixedBudget} onChange={e=>setNewFixedBudget(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white w-14 outline-none text-center"/><button onClick={addFixedExpense} className="bg-orange-600 p-1.5 rounded-lg text-white"><Plus size={14}/></button></div>
                <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-hide">{fixedExpensesList.map(i=><div key={i.id} className="flex justify-between p-1.5 bg-slate-800 rounded-lg text-white text-[10px]"><span>{i.name} ({formatCurrency(i.budget)})</span><Trash2 size={10} className="text-red-400 cursor-pointer" onClick={()=>deleteFixedExpense(i.id)} /></div>)}</div>
             </div>
             
             <button onClick={resetAllData} className="w-full text-red-400 text-[10px] font-bold border border-red-900/50 hover:bg-red-900/20 py-2.5 rounded-xl flex items-center justify-center gap-2 mt-2"><RefreshCw size={10}/> Reiniciar Todo</button>
          </div>
        </div>
      </div>
    );
}

// --- APP PRINCIPAL ---

const Toast = ({ message, type }) => {
  if (!message) return null;
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full z-[80] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in shadow-2xl ${type === 'error' ? 'toast-error' : 'toast-visible'}`}>
      {type === 'error' ? <AlertOctagon size={14} /> : <CheckCircle size={14} />}
      <span className="font-bold text-[10px] tracking-wide">{message}</span>
    </div>
  );
};

const LoginScreen = ({ onLogin }) => (
  <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
    <div className="bg-purple-600 p-4 rounded-3xl shadow-2xl shadow-purple-900/50 mb-6 animate-in zoom-in duration-500"><Wallet size={48} className="text-white" /></div>
    <h1 className="text-xl font-bold text-white mb-2">Finanzas Personales</h1>
    <button onClick={onLogin} className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold text-xs flex items-center gap-3 hover:scale-105 transition-transform shadow-xl mt-6"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="G" />Entrar con Google</button>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  useEffect(() => { const unsub = onAuthStateChanged(auth, (usr) => { setUser(usr); setLoading(false); }); return () => unsub(); }, []);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (error) { alert(error.message); } };
  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-bold text-xs">Cargando...</div>;
  if (!user) return <LoginScreen onLogin={handleGoogleLogin} />;
  return <Dashboard user={user} logout={() => signOut(auth)} />;
}

function Dashboard({ user, logout }) {
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState([]);
  
  // CONFIG
  const [appTitle, setAppTitle] = useState('Finanzas');
  const [mainGoal, setMainGoal] = useState('Ahorrar');
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

  // Inputs
  const [newAccName, setNewAccName] = useState('');
  const [newAccColor, setNewAccColor] = useState('#3b82f6');
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedBudget, setNewFixedBudget] = useState('');
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const years = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032];
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#6366f1', '#14b8a6'];
  const goalOptions = ['Ahorrar', 'Pagar deudas', 'Fondo', 'Invertir', 'Viaje', 'Otro'];

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3000); };

  useEffect(() => {
    const userSettingsRef = doc(db, "user_settings", user.uid);
    const unsub = onSnapshot(userSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppTitle(data.appTitle || 'Finanzas');
        setMainGoal(data.mainGoal || 'Ahorrar');
        setAccounts(data.accounts || []);
        setFixedExpensesList(data.fixedExpensesList || []);
        setGoalsList(data.goalsList || []);
      } else {
        const defaultAccounts = [{ id: 'bancolombia', name: 'Bancolombia', color: '#FCD34D' }, { id: 'nu', name: 'Nu', color: '#8B5CF6' }, { id: 'nequi', name: 'Nequi', color: '#EC4899' }, { id: 'efectivo', name: 'Efectivo', color: '#10B981' }];
        const defaultFixed = [{ id: 1, name: 'Arriendo', budget: 0 }, { id: 2, name: 'Servicios', budget: 0 }, { id: 3, name: 'Celular', budget: 0 }, { id: 4, name: 'Transporte', budget: 0 }];
        setDoc(userSettingsRef, { appTitle: 'Finanzas', mainGoal: 'Ahorrar', accounts: defaultAccounts, fixedExpensesList: defaultFixed, goalsList: [] });
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

  // --- ACTIONS ---
  const updateAppTitle = (val) => { setAppTitle(val); saveSettingsToFirebase({ appTitle: val }); };
  const updateMainGoal = (val) => { setMainGoal(val); saveSettingsToFirebase({ mainGoal: val }); };
  const addAccount = () => { if(!newAccName) return; const newId = newAccName.toLowerCase().replace(/\s+/g, '') + Date.now(); const newAccs = [...accounts, { id: newId, name: newAccName, color: newAccColor }]; saveSettingsToFirebase({ accounts: newAccs }); setNewAccName(''); setNewAccColor('#3b82f6'); };
  const deleteAccount = (id) => { const newAccs = accounts.filter(a => a.id !== id); saveSettingsToFirebase({ accounts: newAccs }); };
  const addFixedExpense = () => { if(!newFixedName || !newFixedBudget) return; const newFixed = [...fixedExpensesList, { id: Date.now(), name: newFixedName, budget: Number(newFixedBudget) }]; saveSettingsToFirebase({ fixedExpensesList: newFixed }); setNewFixedName(''); setNewFixedBudget(''); };
  const deleteFixedExpense = (id) => { const newFixed = fixedExpensesList.filter(x => x.id !== id); saveSettingsToFirebase({ fixedExpensesList: newFixed }); };

  const addGoal = () => {
    const targetVal = parseNumberString(newGoalTarget); const currentVal = parseNumberString(newGoalCurrent);
    if(!newGoalName || targetVal <= 0) return;
    const newGoals = [...goalsList, { id: Date.now(), name: newGoalName, target: targetVal, current: currentVal }];
    saveSettingsToFirebase({ goalsList: newGoals });
    setNewGoalName(''); setNewGoalTarget(''); setNewGoalCurrent('');
  };
  const deleteGoal = (id) => { const newGoals = goalsList.filter(g => g.id !== id); saveSettingsToFirebase({ goalsList: newGoals }); };

  const openConfirm = (title, msg, action, isDanger = false) => { setDialog({ isOpen: true, title, msg, action, isDanger }); };
  const closeConfirm = () => setDialog({ ...dialog, isOpen: false });
  const executeConfirm = () => { if(dialog.action) dialog.action(); closeConfirm(); };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return showToast("Monto inválido", "error");
    if (!formData.account && accounts.length > 0) setFormData(prev => ({ ...prev, account: accounts[0].id }));
    if (formData.type !== 'transfer' && !formData.category) return showToast("Falta categoría", "error");
    if (formData.type === 'transfer' && !formData.toAccount) return showToast("Falta destino", "error");

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
      showToast("¡Guardado!"); 
    } catch (e) { showToast(e.message, "error"); }
  };
  
  const deleteTransaction = async (id) => { await deleteDoc(doc(db, "transactions", id)); };
  
  const resetAllData = async () => {
    showToast("Eliminando...", "error");
    try {
      const batch = writeBatch(db);
      const q = query(collection(db, "transactions"), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => { batch.delete(doc.ref); });
      await batch.commit();
      await deleteDoc(doc(db, "user_settings", user.uid));
      showToast("¡Reiniciado!");
      setShowConfig(false);
    } catch (e) { showToast(e.message, "error"); }
  };

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
  
  const annualData = useMemo(() => { const annualT = transactions.filter(t => { const [tY] = t.date.split('-').map(Number); return tY === selYear; }); return Array.from({length: 12}, (_, i) => { const mt = annualT.filter(t => Number(t.date.split('-')[1]) === (i + 1)); return { name: months[i], Ing: mt.filter(t=>t.type==='income').reduce((a,c)=>a+c.amount,0), Gas: mt.filter(t=>t.type==='expense').reduce((a,c)=>a+c.amount,0) }; }); }, [transactions, selYear]);
  const annualIncome = useMemo(() => annualData.reduce((a,b)=>a+b.Ing,0), [annualData]); 
  const annualExpense = useMemo(() => annualData.reduce((a,b)=>a+b.Gas,0), [annualData]);
  const maxExpenseMonthData = useMemo(() => annualData.reduce((prev, current) => (prev.Gas > current.Gas) ? prev : current, {name: '-', Gas: 0}), [annualData]);
  const annualCatSummary = useMemo(() => { const annualT = transactions.filter(t => { const [tY] = t.date.split('-').map(Number); return tY === selYear; }); return annualT.filter(t => t.type === 'expense' && !t.isTransfer).reduce((acc, curr) => { acc[curr.category] = (acc[curr.category] || 0) + curr.amount; return acc; }, {}); }, [transactions, selYear]);
  const topAnnualCat = Object.keys(annualCatSummary).sort((a,b) => annualCatSummary[b] - annualCatSummary[a])[0] || 'Ninguna';
  const topAnnualCatVal = annualCatSummary[topAnnualCat] || 0;

  const filteredHistory = useMemo(() => monthlyTrans.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase())), [monthlyTrans, searchTerm]);

  const copyAIContext = () => {
    const context = `Objetivo: ${mainGoal}. MES ${months[selMonth]}: Ingresos ${formatCurrency(totalIncome)}, Gastos ${formatCurrency(totalExpenses)}, Libre ${formatCurrency(realBalance)}.`;
    navigator.clipboard.writeText(context);
    showToast("Copiado");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-2 md:p-6 font-sans pb-20 overflow-x-hidden">
      <GlobalStyles />
      <Toast message={toast.msg} type={toast.type} />
      <ConfirmDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.msg} onConfirm={executeConfirm} onCancel={closeConfirm} isDanger={dialog.isDanger} />

      <div className="max-w-7xl mx-auto">
        {/* HEADER COMPACTO: Título arriba, Selectores abajo */}
        <div className="flex flex-col gap-3 mb-4">
           <div className="flex justify-between items-center">
             <h1 className="text-base font-bold text-white flex items-center gap-2 truncate"><div className="bg-gradient-to-br from-purple-600 to-blue-600 p-1.5 rounded-lg shadow-lg"><Wallet className="text-white" size={16}/></div>{appTitle}</h1>
             <div className="flex gap-2">
                <button onClick={() => setShowAnnual(true)} className="p-2 bg-slate-800 rounded-lg text-blue-400 border border-slate-700"><Calendar size={16}/></button>
                <button onClick={() => setShowConfig(true)} className="p-2 bg-slate-800 rounded-lg text-slate-300 border border-slate-700"><Settings size={16}/></button>
                <button onClick={logout} className="p-2 bg-slate-800 rounded-lg text-red-400 border border-slate-700 md:hidden"><LogOut size={16}/></button>
             </div>
           </div>
           <div className="flex gap-2 w-full">
             <div className="flex-1"><CustomSelect value={selMonth} onChange={setSelMonth} options={months} type="month" /></div>
             <div className="w-24"><CustomSelect value={selYear} onChange={setSelYear} options={years} type="year" /></div>
             <button onClick={logout} className="hidden md:block p-2 bg-slate-800 rounded-lg text-red-400 border border-slate-700"><LogOut size={16}/></button>
           </div>
        </div>

        <AccountsPanel accounts={accounts} transactions={transactions} />
        <KpiCards totalIncome={totalIncome} totalExpenses={totalExpenses} totalVariable={totalVariable} virtualAvailable={virtualAvailable} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <TransactionForm formData={formData} setFormData={setFormData} onSave={handleTransaction} accounts={accounts} fixedNames={fixedExpensesList.map(i=>i.name)} mainGoal={mainGoal} copyAIContext={copyAIContext} />
          </div>
          <ExpensesAndHistory activeTab={activeTab} setActiveTab={setActiveTab} fixedProgress={fixedProgress} fixedStatus={fixedStatus} variableSummary={variableSummary} totalBudgetFixed={totalBudgetFixed} totalRealFixed={totalRealFixed} filteredHistory={filteredHistory} searchTerm={searchTerm} setSearchTerm={setSearchTerm} expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory} onDelete={(id)=>openConfirm("Eliminar", "¿Borrar?", ()=>deleteTransaction(id), true)} />
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
        accounts={accounts} addAccount={addAccount} deleteAccount={(id)=>openConfirm("Borrar Cuenta", "No borra historial.", ()=>deleteAccount(id), true)}
        fixedExpensesList={fixedExpensesList} addFixedExpense={addFixedExpense} deleteFixedExpense={(id)=>openConfirm("Borrar Gasto", "¿Seguro?", ()=>deleteFixedExpense(id), true)}
        resetAllData={()=>openConfirm("Reiniciar", "Se borrará TODO.", resetAllData, true)}
        goalOptions={goalOptions}
        newAccName={newAccName} setNewAccName={setNewAccName} newAccColor={newAccColor} setNewAccColor={setNewAccColor}
        newFixedName={newFixedName} setNewFixedName={setNewFixedName} newFixedBudget={newFixedBudget} setNewFixedBudget={setNewFixedBudget}
      />
    </div>
  );
}
