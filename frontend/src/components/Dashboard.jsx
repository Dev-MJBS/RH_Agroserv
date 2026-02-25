import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Upload, Download, Search, LogOut, Plus, ShieldCheck, Check, X,
  FileText, Users, DollarSign, PieChart as PieChartIcon 
} from 'lucide-react';

const Dashboard = ({ user, isAdmin }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [mesReferencia, setMesReferencia] = useState('');
  const [payrollMapFile, setPayrollMapFile] = useState(null);
  const [conveniaFile, setConveniaFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchData();
    if (isAdmin) {
      fetchPendingUsers();
    }
  }, [isAdmin]);

  const fetchPendingUsers = async () => {
    try {
      const q = query(collection(db, "users"), where("isApproved", "==", false));
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setPendingUsers(users);
    } catch (err) {
      console.error("Erro ao buscar usuários pendentes", err);
    }
  };

  const approveUser = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), { isApproved: true });
      fetchPendingUsers();
    } catch (err) {
      alert("Erro ao aprovar usuário");
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Excluir solicitação?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchPendingUsers();
    } catch (err) {
      alert("Erro ao excluir usuário");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await axios.get('http://localhost:8000/folha', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err) {
      console.error("Erro ao buscar dados da folha", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!payrollMapFile || !conveniaFile || !mesReferencia) {
      alert('Por favor, preencha o mês e selecione os dois arquivos.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('mes_referencia', mesReferencia);
    formData.append('payroll_map', payrollMapFile);
    formData.append('convenia_data', conveniaFile);

    try {
      const token = await user.getIdToken();
      await axios.post('http://localhost:8000/upload-payroll', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setIsModalOpen(false);
      setPayrollMapFile(null);
      setConveniaFile(null);
      setMesReferencia('');
      fetchData();
    } catch (err) {
      alert('Erro no processamento dos arquivos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'CPF', 'Salario Liquido', 'Centro de Custo', 'Banco', 'Agencia', 'Conta', 'Mes'];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(row => [
        row.nome_funcionario,
        `"${row.cpf}"`,
        row.salario_liquido,
        row.centro_de_custo,
        row.banco,
        row.agencia,
        row.conta,
        row.mes_referencia
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const filteredData = data.filter(entry => 
    entry.nome_funcionario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.centro_de_custo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chartData = Object.entries(
    data.reduce((acc, curr) => {
      acc[curr.centro_de_custo] = (acc[curr.centro_de_custo] || 0) + curr.salario_liquido;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const bankDataByCC = data.reduce((acc, curr) => {
    const cc = curr.centro_de_custo;
    const banco = curr.banco || 'Não Informado';
    if (!acc[cc]) acc[cc] = {};
    acc[cc][banco] = (acc[cc][banco] || 0) + curr.salario_liquido;
    return acc;
  }, {});

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-800">RH Agroserv Financeiro</h1>
          {isAdmin && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase tracking-wider">Admin</span>}
        </div>
        <div className="flex gap-4 items-center">
          {isAdmin && (
            <button 
              onClick={() => setIsAdminModalOpen(true)}
              className="relative flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
            >
              <Users size={18} /> 
              Gerenciar Usuários
              {pendingUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-bold">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Adicionar Mês
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </header>

      {isAdmin && (
        <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <p className="text-yellow-800 font-semibold mb-2">Painel de Administração</p>
          <button 
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
          >
            <ShieldCheck size={18} /> Gerenciar Aprovações
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users /></div>
            <div>
              <p className="text-gray-500 text-sm">Total Colaboradores</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign /></div>
            <div>
              <p className="text-gray-500 text-sm">Gasto Total</p>
              <p className="text-2xl font-bold">R$ {data.reduce((a, b) => a + b.salario_liquido, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><PieChartIcon /></div>
            <div>
              <p className="text-gray-500 text-sm">Centros de Custo</p>
              <p className="text-2xl font-bold">{[...new Set(data.map(d => d.centro_de_custo))].length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="font-bold mb-4">Distribuição por Centro de Custo</h3>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 overflow-y-auto">
          <h3 className="font-bold mb-4">Volume Financeiro por Banco e CC</h3>
          <div className="space-y-4">
            {Object.entries(bankDataByCC).map(([cc, banks]) => (
              <div key={cc} className="border-b pb-2 last:border-0">
                <p className="text-sm font-bold text-gray-700 mb-1 uppercase bg-gray-50 px-2 py-1 rounded">{cc}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(banks).map(([bank, total]) => (
                    <div key={bank} className="flex justify-between text-xs px-2">
                      <span className="text-gray-600">{bank}:</span>
                      <span className="font-semibold text-gray-800">R$ {total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou centro de custo..." 
              className="pl-10 pr-4 py-2 border rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition"
          >
            <Download size={18} /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Funcionário</th>
                <th className="p-4 font-semibold text-gray-600">CPF</th>
                <th className="p-4 font-semibold text-gray-600">Centro de Custo</th>
                <th className="p-4 font-semibold text-gray-600">Banco</th>
                <th className="p-4 font-semibold text-gray-600">Salário</th>
                <th className="p-4 font-semibold text-gray-600">Mês</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(entry => (
                <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="p-4">{entry.nome_funcionario}</td>
                  <td className="p-4">{entry.cpf}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      {entry.centro_de_custo}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{entry.banco || '-'}</td>
                  <td className="p-4 font-medium">R$ {entry.salario_liquido.toLocaleString()}</td>
                  <td className="p-4 text-gray-500">{entry.mes_referencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[450px]">
            <h3 className="text-xl font-bold mb-4">Mapa da Folha - Extração</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1">Mês de Referência</label>
                <input 
                  type="month" 
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Mapa da Folha (PDF)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setPayrollMapFile(e.target.files[0])}
                      className="hidden" 
                      id="payroll-map-upload"
                    />
                    <label htmlFor="payroll-map-upload" className="cursor-pointer">
                      <FileText className="mx-auto text-gray-400 mb-1" size={24} />
                      <p className="text-[10px] text-gray-600 truncate">{payrollMapFile ? payrollMapFile.name : 'Subir PDF'}</p>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Dados Convenia (PDF)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      onChange={(e) => setConveniaFile(e.target.files[0])}
                      className="hidden" 
                      id="convenia-upload"
                    />
                    <label htmlFor="convenia-upload" className="cursor-pointer">
                      <Users className="mx-auto text-gray-400 mb-1" size={24} />
                      <p className="text-[10px] text-gray-600 truncate">{conveniaFile ? conveniaFile.name : 'Subir PDF'}</p>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-gray-600 font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!payrollMapFile || !conveniaFile || !mesReferencia || isUploading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {isUploading ? 'Processando...' : 'Iniciar Mapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Usuários */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-blue-600" />
                <h3 className="text-xl font-bold text-gray-800">Solicitações de Acesso</h3>
              </div>
              <button onClick={() => setIsAdminModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {pendingUsers.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Nenhuma solicitação pendente.</div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 border rounded-xl">
                      <div>
                        <p className="font-bold text-gray-800">{u.email}</p>
                        <p className="text-xs text-gray-400">Desde: {new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveUser(u.id)} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700">
                          <Check size={18} />
                        </button>
                        <button onClick={() => deleteUser(u.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
