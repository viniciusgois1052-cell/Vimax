from flask import Blueprint, jsonify, request, send_file
from sqlalchemy import func, extract
from .. import db
from ..models.chamado import Chamado
from ..models.ativo import Ativo
from ..models.empresa import Empresa
from ..models.orcamento import Orcamento
from ..models.contrato import Contrato
from ..models.categoria_chamado import CategoriaChamado
from datetime import datetime
from openpyxl import Workbook
from io import BytesIO

relatorio_bp = Blueprint("relatorio_bp", __name__)

@relatorio_bp.route("/dashboard", methods=["GET"])
def dashboard_relatorios():
    try:
        # 1. Estatísticas por Empresa (Orçamentos + Custos de Chamados + Ativos sem Contrato)
        empresas = Empresa.query.all()
        stats_map = {}
        for emp in empresas:
            stats_map[emp.id] = {
                "nome": emp.nome,
                "gasto_orcamentos": 0.0,
                "custo_chamados": 0.0,
                "ativos": 0,
                "ativos_sem_contrato": 0
            }
            
        # Gastos por Orçamentos Aprovados
        gastos_orc_raw = (
            db.session.query(Orcamento.empresa_id, func.sum(Orcamento.valor))
            .filter(Orcamento.status == 'Aprovado')
            .group_by(Orcamento.empresa_id).all()
        )
        for emp_id, total in gastos_orc_raw:
            if emp_id in stats_map: stats_map[emp_id]["gasto_orcamentos"] = float(total or 0)
                
        # Custos por Chamados (valor_total)
        custos_cham_raw = (
            db.session.query(Chamado.empresa_id, func.sum(Chamado.valor_total))
            .filter(Chamado.ativo == True)
            .group_by(Chamado.empresa_id).all()
        )
        for emp_id, total in custos_cham_raw:
            if emp_id in stats_map: stats_map[emp_id]["custo_chamados"] = float(total or 0)

        # Qtd Ativos
        ativos_raw = db.session.query(Ativo.empresa_id, func.count(Ativo.id)).group_by(Ativo.empresa_id).all()
        for emp_id, qtd in ativos_raw:
            if emp_id in stats_map: stats_map[emp_id]["ativos"] = int(qtd or 0)
        
        # Qtd Ativos sem Contrato por Empresa
        ativos_sem_contrato_raw = (
            db.session.query(Ativo.empresa_id, func.count(Ativo.id))
            .filter(Ativo.contrato_id == None)
            .group_by(Ativo.empresa_id).all()
        )
        for emp_id, qtd in ativos_sem_contrato_raw:
            if emp_id in stats_map: stats_map[emp_id]["ativos_sem_contrato"] = int(qtd or 0)
        
        empresas_stats = sorted(list(stats_map.values()), key=lambda x: x["nome"])

        # 2. Ativos com maior custo (Chamados + Orçamentos)
        # Custos de Chamados por Ativo
        custos_ativos_chamados = []
        try:
            ativos_custos_chamados = (
                db.session.query(Ativo.nome, func.sum(Chamado.valor_total))
                .join(Chamado, Chamado.ativo_id == Ativo.id)
                .filter(Chamado.ativo == True)
                .group_by(Ativo.nome)
                .order_by(func.sum(Chamado.valor_total).desc())
                .limit(10).all()
            )
            custos_ativos_chamados = [[a[0], float(a[1] or 0)] for a in ativos_custos_chamados]
        except Exception as e:
            print(f"Erro ao buscar custos de chamados por ativo: {e}")

        # Gastos de Orçamentos por Ativo
        gastos_ativos_orcamentos = []
        try:
            ativos_gastos_orc = (
                db.session.query(Ativo.nome, func.sum(Orcamento.valor))
                .join(Orcamento, Ativo.orcamento_id == Orcamento.id)
                .filter(Orcamento.status == 'Aprovado')
                .group_by(Ativo.nome)
                .order_by(func.sum(Orcamento.valor).desc())
                .limit(10).all()
            )
            gastos_ativos_orcamentos = [[a[0], float(a[1] or 0)] for a in ativos_gastos_orc]
        except Exception as e:
            print(f"Erro ao buscar gastos de orçamentos por ativo: {e}")

        # 3. Ativos sem contratos (Total Global)
        ativos_sem_contrato_count = db.session.query(func.count(Ativo.id)).filter(Ativo.contrato_id == None).scalar() or 0

        # 4. Gasto médio global (Orçamentos)
        gasto_medio_global = db.session.query(func.avg(Orcamento.valor)).filter(Orcamento.status == 'Aprovado').scalar() or 0

        # 5. Chamados por categoria
        categorias_count = (
            db.session.query(CategoriaChamado.nome, func.count(Chamado.id))
            .join(Chamado, Chamado.categoria_id == CategoriaChamado.id)
            .filter(Chamado.ativo == True)
            .group_by(CategoriaChamado.nome).all()
        )
        chamados_por_categoria = [[c[0], int(c[1] or 0)] for c in categorias_count]

        # 6. Evolução Mensal
        chamados_mes = (
            db.session.query(extract('month', Chamado.created_at), extract('year', Chamado.created_at), func.count(Chamado.id))
            .filter(Chamado.ativo == True)
            .group_by(extract('year', Chamado.created_at), extract('month', Chamado.created_at))
            .order_by(extract('year', Chamado.created_at).desc(), extract('month', Chamado.created_at).desc())
            .limit(12).all()
        )
        chamados_mes.reverse()
        meses_nomes = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        chamados_por_mes = []
        for c in chamados_mes:
            try:
                chamados_por_mes.append([f"{meses_nomes[int(c[0])]}/{str(int(c[1]))[-2:]}", int(c[2])])
            except: continue

        # 7. Resumo Geral
        total_ativos = db.session.query(func.count(Ativo.id)).scalar() or 0
        total_chamados = db.session.query(func.count(Chamado.id)).filter(Chamado.ativo == True).scalar() or 0
        total_gasto_orcamentos = db.session.query(func.sum(Orcamento.valor)).filter(Orcamento.status == 'Aprovado').scalar() or 0
        total_custo_chamados = db.session.query(func.sum(Chamado.valor_total)).filter(Chamado.ativo == True).scalar() or 0

        return jsonify({
            "empresas_stats": empresas_stats,
            "custos_ativos_chamados": custos_ativos_chamados,
            "gastos_ativos_orcamentos": gastos_ativos_orcamentos,
            "ativos_sem_contrato": int(ativos_sem_contrato_count),
            "gasto_medio_global": float(gasto_medio_global),
            "chamados_por_categoria": chamados_por_categoria,
            "chamados_por_mes": chamados_por_mes,
            "resumo": {
                "total_ativos": int(total_ativos),
                "total_chamados": int(total_chamados),
                "total_gasto_orcamentos": float(total_gasto_orcamentos or 0),
                "total_custo_chamados": float(total_custo_chamados or 0),
                "ativos_sem_contrato": int(ativos_sem_contrato_count)
            }
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@relatorio_bp.route("/export/empresas_stats", methods=["GET"])
def export_empresas_stats():
    try:
        empresas = Empresa.query.all()
        stats_map = {}
        for emp in empresas:
            stats_map[emp.id] = {
                "nome": emp.nome,
                "gasto_orcamentos": 0.0,
                "custo_chamados": 0.0,
                "ativos": 0,
                "ativos_sem_contrato": 0
            }
            
        gastos_orc_raw = (
            db.session.query(Orcamento.empresa_id, func.sum(Orcamento.valor))
            .filter(Orcamento.status == 'Aprovado')
            .group_by(Orcamento.empresa_id).all()
        )
        for emp_id, total in gastos_orc_raw:
            if emp_id in stats_map: stats_map[emp_id]["gasto_orcamentos"] = float(total or 0)
                
        custos_cham_raw = (
            db.session.query(Chamado.empresa_id, func.sum(Chamado.valor_total))
            .filter(Chamado.ativo == True)
            .group_by(Chamado.empresa_id).all()
        )
        for emp_id, total in custos_cham_raw:
            if emp_id in stats_map: stats_map[emp_id]["custo_chamados"] = float(total or 0)

        ativos_raw = db.session.query(Ativo.empresa_id, func.count(Ativo.id)).group_by(Ativo.empresa_id).all()
        for emp_id, qtd in ativos_raw:
            if emp_id in stats_map: stats_map[emp_id]["ativos"] = int(qtd or 0)
        
        ativos_sem_contrato_raw = (
            db.session.query(Ativo.empresa_id, func.count(Ativo.id))
            .filter(Ativo.contrato_id == None)
            .group_by(Ativo.empresa_id).all()
        )
        for emp_id, qtd in ativos_sem_contrato_raw:
            if emp_id in stats_map: stats_map[emp_id]["ativos_sem_contrato"] = int(qtd or 0)
        
        empresas_stats = sorted(list(stats_map.values()), key=lambda x: x["nome"])

        wb = Workbook()
        ws = wb.active
        ws.title = "Empresas Stats"

        headers = ["Empresa", "Qtd. Ativos", "Ativos sem Contrato", "Custo Chamados", "Gasto Orçamentos"]
        ws.append(headers)

        for e in empresas_stats:
            ws.append([
                e["nome"],
                e["ativos"],
                e["ativos_sem_contrato"],
                e["custo_chamados"],
                e["gasto_orcamentos"]
            ])

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="empresas_stats.xlsx"
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@relatorio_bp.route("/export/custos_ativos_chamados", methods=["GET"])
def export_custos_ativos_chamados():
    try:
        custos_ativos_chamados = []
        ativos_custos_chamados = (
            db.session.query(Ativo.nome, func.sum(Chamado.valor_total))
            .join(Chamado, Chamado.ativo_id == Ativo.id)
            .filter(Chamado.ativo == True)
            .group_by(Ativo.nome)
            .order_by(func.sum(Chamado.valor_total).desc())
            .all()
        )
        custos_ativos_chamados = [[a[0], float(a[1] or 0)] for a in ativos_custos_chamados]

        wb = Workbook()
        ws = wb.active
        ws.title = "Custos Chamados por Ativo"

        headers = ["Ativo", "Custo Total Chamados"]
        ws.append(headers)

        for a in custos_ativos_chamados:
            ws.append([a[0], a[1]])

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="custos_ativos_chamados.xlsx"
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@relatorio_bp.route("/export/gastos_ativos_orcamentos", methods=["GET"])
def export_gastos_ativos_orcamentos():
    try:
        gastos_ativos_orcamentos = []
        ativos_gastos_orc = (
            db.session.query(Ativo.nome, func.sum(Orcamento.valor))
            .join(Orcamento, Ativo.orcamento_id == Orcamento.id)
            .filter(Orcamento.status == 'Aprovado')
            .group_by(Ativo.nome)
            .order_by(func.sum(Orcamento.valor).desc())
            .all()
        )
        gastos_ativos_orcamentos = [[a[0], float(a[1] or 0)] for a in ativos_gastos_orc]

        wb = Workbook()
        ws = wb.active
        ws.title = "Gastos Orçamentos por Ativo"

        headers = ["Ativo", "Gasto Total Orçamentos"]
        ws.append(headers)

        for a in gastos_ativos_orcamentos:
            ws.append([a[0], a[1]])

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="gastos_ativos_orcamentos.xlsx"
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@relatorio_bp.route("/export/chamados_por_categoria", methods=["GET"])
def export_chamados_por_categoria():
    try:
        categorias_count = (
            db.session.query(CategoriaChamado.nome, func.count(Chamado.id))
            .join(Chamado, Chamado.categoria_id == CategoriaChamado.id)
            .filter(Chamado.ativo == True)
            .group_by(CategoriaChamado.nome).all()
        )
        chamados_por_categoria = [[c[0], int(c[1] or 0)] for c in categorias_count]

        wb = Workbook()
        ws = wb.active
        ws.title = "Chamados por Categoria"

        headers = ["Categoria", "Qtd. Chamados"]
        ws.append(headers)

        for c in chamados_por_categoria:
            ws.append([c[0], c[1]])

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="chamados_por_categoria.xlsx"
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@relatorio_bp.route("/export/chamados_por_mes", methods=["GET"])
def export_chamados_por_mes():
    try:
        chamados_mes = (
            db.session.query(extract('month', Chamado.created_at), extract('year', Chamado.created_at), func.count(Chamado.id))
            .filter(Chamado.ativo == True)
            .group_by(extract('year', Chamado.created_at), extract('month', Chamado.created_at))
            .order_by(extract('year', Chamado.created_at).desc(), extract('month', Chamado.created_at).desc())
            .all()
        )
        chamados_mes.reverse()
        meses_nomes = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        chamados_por_mes = []
        for c in chamados_mes:
            try:
                chamados_por_mes.append([f"{meses_nomes[int(c[0])]}/{str(int(c[1]))[-2:]}", int(c[2])])
            except: continue

        wb = Workbook()
        ws = wb.active
        ws.title = "Evolução de Chamados"

        headers = ["Mês/Ano", "Qtd. Chamados"]
        ws.append(headers)

        for c in chamados_por_mes:
            ws.append([c[0], c[1]])

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="chamados_por_mes.xlsx"
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@relatorio_bp.route("/export/ativos_sem_contrato", methods=["GET"])
def export_ativos_sem_contrato():
    try:
        ativos_sem_contrato_detalhes = (
            db.session.query(Ativo.nome, Empresa.nome, Ativo.localizacao)
            .join(Empresa, Ativo.empresa_id == Empresa.id)
            .filter(Ativo.contrato_id == None)
            .all()
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "Ativos sem Contrato"

        headers = ["Ativo", "Empresa", "Localização"]
        ws.append(headers)

        for a in ativos_sem_contrato_detalhes:
            ws.append([a[0], a[1], a[2]])

        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)

        return send_file(
            excel_file,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name="ativos_sem_contrato.xlsx"
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
