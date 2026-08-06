#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys


path = Path(sys.argv[1] if len(sys.argv) > 1 else "/var/www/cmms_project/frontend/src/pages/projeto/Projeto.jsx")
if not path.exists():
    raise SystemExit(f"Arquivo não encontrado: {path}")

source = path.read_text(encoding="utf-8")

react_import = "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'"
portal_import = "import { createPortal } from 'react-dom'"

if "function DurationEditor(" not in source:
    raise SystemExit("DurationEditor não encontrado. A correção anterior de duração ainda não está no arquivo.")
if "function DateEditor(" not in source:
    raise SystemExit("DateEditor não encontrado. A correção anterior de calendário ainda não está no arquivo.")
if source.count("{open && <>") != 2 or source.count("    </>}") != 2:
    raise SystemExit("Estrutura dos dois editores diferente da esperada. O arquivo não foi alterado.")
if portal_import in source:
    raise SystemExit("A correção dos pop-ups já foi aplicada anteriormente.")
if source.count(react_import) != 1:
    raise SystemExit("Importação principal do React não encontrada exatamente uma vez. O arquivo não foi alterado.")

updated = source.replace(react_import, react_import + "\n" + portal_import, 1)
updated = updated.replace("{open && <>", "{open && createPortal(<>")
updated = updated.replace("    </>}", "    </>, document.body)}")

# O portal sai de qualquer overflow/stacking context do Gantt. Estes z-indexes
# também evitam que cabeçalhos fixos cubram o editor.
updated = updated.replace("z-[280]", "z-[9998]").replace("z-[281]", "z-[9999]")

backup = path.with_name(path.name + ".bak-popups")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")

print(f"Pop-ups de data e duração corrigidos em: {path}")
print(f"Backup criado em: {backup}")