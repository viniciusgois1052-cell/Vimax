import React, { useEffect, useState } from "react";
import {
  FaClipboardList,
  FaFileInvoice,
  FaTools,
  FaUsers,
  FaBuilding
} from "react-icons/fa";

import { useEntity } from "../context/EntityContext";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { selectedEntity } = useEntity();
  const { user } = useAuth();

  const API_URL = import.meta.env.DEV
    ? "http://192.168.2.70:5002/api"
    : "/api";

  const [stats, setStats] = useState({
    chamados: 0,
    orcamentos: 0,
    ativos: 0,
    usuarios: 0,
    empresas: 0
  });

  const fetchData = async () => {
    try {
      const headers = {};
      if (user?.api_token) {
        headers["X-API-Token"] = user.api_token;
      }

      const query =
        selectedEntity !== "all"
          ? `?empresa_id=${selectedEntity}`
          : "";

      const [chamados, orcamentos, ativos, usuarios, empresas] =
        await Promise.all([
          fetch(`${API_URL}/chamados/${query}`, { headers }).then(r =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_URL}/orcamentos/${query}`, { headers }).then(r =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_URL}/ativos/${query}`, { headers }).then(r =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_URL}/usuarios/`, { headers }).then(r =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_URL}/empresas/`, { headers }).then(r =>
            r.ok ? r.json() : []
          )
        ]);

      setStats({
        chamados: chamados.length || 0,
        orcamentos: orcamentos.length || 0,
        ativos: ativos.length || 0,
        usuarios: usuarios.length || 0,
        empresas: empresas.length || 0
      });
    } catch (err) {
      console.error("Erro dashboard:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEntity]);

  const Card = ({ icon, title, value, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-xl font-bold text-gray-800">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-xl font-bold text-gray-800 mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card
          icon={<FaClipboardList className="text-indigo-600" />}
          title="Chamados"
          value={stats.chamados}
          color="bg-indigo-50"
        />
        <Card
          icon={<FaFileInvoice className="text-green-600" />}
          title="Orçamentos"
          value={stats.orcamentos}
          color="bg-green-50"
        />
        <Card
          icon={<FaTools className="text-orange-600" />}
          title="Ativos"
          value={stats.ativos}
          color="bg-orange-50"
        />
        <Card
          icon={<FaUsers className="text-blue-600" />}
          title="Usuários"
          value={stats.usuarios}
          color="bg-blue-50"
        />
        <Card
          icon={<FaBuilding className="text-purple-600" />}
          title="Empresas"
          value={stats.empresas}
          color="bg-purple-50"
        />
      </div>
    </div>
  );
};

export default Dashboard;
