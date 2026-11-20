import re
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import docx.opc.constants

def clean_math_text(s: str) -> str:
    s = s.strip()
    if s.startswith('$$') and s.endswith('$$'):
        s = s[2:-2].strip()
    elif s.startswith('$') and s.endswith('$'):
        s = s[1:-1].strip()

    # Known typos
    s = s.replace('($WCIS)', '(WCI)').replace('$WCIS', 'WCI').replace('$WCI', 'WCI')

    # Specific macros
    s = re.sub(r'\\text\{([^}]+)\}', r'\1', s)
    s = re.sub(r'\\mathbf\{([^}]+)\}', r'\1', s)
    s = re.sub(r'\\mathbb\{([A-Za-z]+)\}', r'\1', s)
    s = re.sub(r'\\mathcal\{([A-Za-z]+)\}', r'\1', s)
    s = re.sub(r'\\mathtt\{([^}]+)\}', r'\1', s)
    s = re.sub(r'\\widehat\{([^}]+)\}', r'ŷ_\1', s)

    # Fractions
    frac_pattern = r'\\frac\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}'
    while re.search(frac_pattern, s):
        s = re.sub(frac_pattern, r'(\1 / \2)', s)

    # Left and Right delimiters
    s = re.sub(r'\\left\[', r'[', s)
    s = re.sub(r'\\right\]', r']', s)
    s = re.sub(r'\\left\(', r'(', s)
    s = re.sub(r'\\right\)', r')', s)
    s = re.sub(r'\\left\|', r'|', s)
    s = re.sub(r'\\right\|', r'|', s)
    s = s.replace(r'\left', '').replace(r'\right', '')

    # Standard symbols
    s = s.replace(r'\cdot', ' · ')
    s = s.replace(r'\times', ' × ')
    s = s.replace(r'\Delta', 'Δ')
    s = s.replace(r'\mu', 'μ')
    s = s.replace(r'\sigma', 'σ')
    s = s.replace(r'\alpha', 'α')
    s = s.replace(r'\beta', 'β')
    s = s.replace(r'\theta', 'θ')
    s = s.replace(r'\lambda', 'λ')
    s = s.replace(r'\epsilon', 'ε')
    s = s.replace(r'\psi', 'ψ')
    s = s.replace(r'\eta', 'η')
    s = re.sub(r'\\le\b', '≤', s)
    s = re.sub(r'\\ge\b', '≥', s)
    s = re.sub(r'\\to\b', '→', s)
    s = re.sub(r'\\in\b', '∈', s)
    s = s.replace(r'\dots', '...')
    s = s.replace(r'\parallel', ' ‖ ')
    s = s.replace(r'\%', '%')
    s = s.replace(r'\_', '_')
    s = s.replace(r'\sum', '∑')
    s = s.replace(r'\sqrt', '√')
    s = s.replace(r'\ln', 'ln')
    s = s.replace(r'\log', 'log')
    s = s.replace(r'\min', 'min')
    s = s.replace(r'\max', 'max')
    s = s.replace(r'\quad', '   ')

    # Subscripts & Superscripts
    s = re.sub(r'_\{([^}]+)\}', r'_\1', s)
    s = re.sub(r'\^\{([^}]+)\}', r'^\1', s)
    s = s.replace('{', '').replace('}', '')
    s = s.replace('\\', '')

    # Clean double parentheses
    s = re.sub(r'\(\s*\(([^()]+)\)\s*\)', r'(\1)', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def add_hyperlink(paragraph, url, text, font_size=11, color="1155CC", underline=True):
    """Add a native Word clickable hyperlink run to a paragraph."""
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = parse_xml(f'<w:hyperlink xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>')
    new_run = parse_xml(f'<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>')
    new_run_prop = parse_xml(f'<w:rPr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:color w:val="{color}"/><w:u w:val="{"single" if underline else "none"}"/><w:sz w:val="{int(font_size * 2)}"/></w:rPr>')
    new_run.append(new_run_prop)
    new_run_text = parse_xml(f'<w:t xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xml:space="preserve">{text}</w:t>')
    new_run.append(new_run_text)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)

def set_cell_margins(cell, top=80, bottom=80, left=120, right=120):
    """Set inner padding for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(margin_name)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_borders(cell, color="666666", sz="4", val="single"):
    """Set clean, standard dark/gray borders for table cells with NO background shading."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
        </w:tcBorders>
    ''')
    tcPr.append(tcBorders)

def add_formatted_runs(paragraph, text, base_font_name="Times New Roman", base_font_size=12, italic_all=False):
    """Parses markdown bold, italic, code, math, and hyperlinks into runs."""
    pattern = r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$|\[.*?\]\(https?://[^\)]+\)|https?://[^\s\)]+)'
    tokens = re.split(pattern, text)
    for token in tokens:
        if not token:
            continue

        # Markdown Link [label](url)
        link_match = re.match(r'^\[(.*?)\]\((https?://[^\)]+)\)$', token)
        if link_match:
            label = link_match.group(1).strip()
            url = link_match.group(2).strip()
            add_hyperlink(paragraph, url, label, font_size=base_font_size)
            continue

        # Raw URL
        if re.match(r'^https?://\S+$', token):
            add_hyperlink(paragraph, token, token, font_size=base_font_size)
            continue

        run = paragraph.add_run()
        run.font.name = base_font_name
        run.font.size = Pt(base_font_size)
        if italic_all:
            run.italic = True
        
        if token.startswith('**') and token.endswith('**') and len(token) >= 4:
            run.text = token[2:-2]
            run.bold = True
        elif token.startswith('*') and token.endswith('*') and len(token) >= 2:
            run.text = token[1:-1]
            run.italic = True
        elif token.startswith('`') and token.endswith('`') and len(token) >= 2:
            run.text = token[1:-1]
            run.font.name = 'Consolas'
            run.font.size = Pt(base_font_size - 1)
            run.font.color.rgb = RGBColor(120, 20, 40)
        elif token.startswith('$') and token.endswith('$') and len(token) >= 2:
            # Clean math typography
            math_content = clean_math_text(token[1:-1])
            run.text = math_content
            run.font.name = 'Cambria Math'
            run.italic = True
            run.font.color.rgb = RGBColor(15, 35, 75)
        else:
            run.text = token

def parse_markdown_to_docx(md_path, docx_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    doc = Document()

    # Configure Margins (Fr. CRCE guidelines: Left 30mm, Right 20mm, Top 25mm, Bottom 25mm)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.2)   # 30 mm
        section.right_margin = Inches(0.8)  # 20 mm

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(20, 20, 20)

    lines = content.split('\n')
    i = 0
    in_code_block = False
    code_block_lines = []
    
    in_table = False
    table_lines = []
    last_was_page_break = True  # Avoid starting with an unnecessary blank page

    def flush_table():
        nonlocal in_table, table_lines, last_was_page_break
        if not table_lines:
            in_table = False
            return
        
        parsed_rows = []
        for line in table_lines:
            cells = [c.strip() for c in line.split('|')[1:-1]]
            if cells and not all(set(c) <= {'-', ':', ' '} for c in cells):
                parsed_rows.append(cells)
        
        if parsed_rows:
            num_cols = max(len(row) for row in parsed_rows)
            t = doc.add_table(rows=len(parsed_rows), cols=num_cols)
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
            t.autofit = True

            for r_idx, row_data in enumerate(parsed_rows):
                for c_idx in range(num_cols):
                    cell = t.cell(r_idx, c_idx)
                    val = row_data[c_idx] if c_idx < len(row_data) else ""
                    cell.text = ""
                    p = cell.paragraphs[0]
                    p.paragraph_format.space_before = Pt(3)
                    p.paragraph_format.space_after = Pt(3)
                    p.paragraph_format.line_spacing = 1.15
                    
                    set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
                    # Simple clean borders, NO BACKGROUND COLOR
                    set_cell_borders(cell, color="444444" if r_idx == 0 else "777777", sz="6" if r_idx == 0 else "4")

                    if r_idx == 0:
                        add_formatted_runs(p, val, base_font_size=10.5)
                        for r in p.runs:
                            r.bold = True
                            r.font.color.rgb = RGBColor(10, 10, 10)
                    else:
                        add_formatted_runs(p, val, base_font_size=10)

            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(0)
            sp.paragraph_format.space_after = Pt(4)
            last_was_page_break = False

        table_lines = []
        in_table = False

    def flush_code():
        nonlocal in_code_block, code_block_lines, last_was_page_break
        if not code_block_lines:
            in_code_block = False
            return
        
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
        set_cell_borders(cell, color="AAAAAA", sz="4")

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15

        for line_idx, cline in enumerate(code_block_lines):
            run = p.add_run(cline + ('\n' if line_idx < len(code_block_lines) - 1 else ''))
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(30, 30, 30)

        sp = doc.add_paragraph()
        sp.paragraph_format.space_after = Pt(4)
        last_was_page_break = False

        code_block_lines = []
        in_code_block = False

    while i < len(lines):
        line = lines[i].rstrip()
        
        # Ignore raw LaTeX spacing commands
        if line.strip().startswith(r'\vspace'):
            i += 1
            continue

        # Code blocks
        if line.strip().startswith('```'):
            if in_table:
                flush_table()
            if in_code_block:
                flush_code()
            else:
                in_code_block = True
            i += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue

        # Tables
        if line.strip().startswith('|') and line.strip().endswith('|'):
            in_table = True
            table_lines.append(line)
            i += 1
            continue
        elif in_table:
            flush_table()

        # Page Breaks (Never create consecutive blank page breaks)
        if line.strip() in ['\\newpage', '---']:
            if not last_was_page_break:
                doc.add_page_break()
                last_was_page_break = True
            i += 1
            continue

        # Empty lines
        if not line.strip():
            i += 1
            continue

        # Headings
        if line.startswith('# '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(10)
            p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, line[2:].strip(), base_font_size=18)
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(15, 34, 64)
            last_was_page_break = False
            i += 1
            continue

        if line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, line[3:].strip(), base_font_size=15)
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(20, 50, 90)
            last_was_page_break = False
            i += 1
            continue

        if line.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, line[4:].strip(), base_font_size=13)
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(30, 41, 59)
            last_was_page_break = False
            i += 1
            continue

        # Blockquotes
        if line.startswith('> '):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.4)
            p.paragraph_format.right_indent = Inches(0.4)
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            add_formatted_runs(p, line[2:].strip(), base_font_size=11, italic_all=True)
            last_was_page_break = False
            i += 1
            continue

        # Display Math ($$ ... $$)
        if line.strip().startswith('$$') and line.strip().endswith('$$') and len(line.strip()) > 4:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            raw_math = line.strip()[2:-2].strip()
            math_text = clean_math_text(raw_math)
            run = p.add_run(math_text)
            run.font.name = 'Cambria Math'
            run.font.size = Pt(12)
            run.italic = True
            run.font.color.rgb = RGBColor(10, 40, 80)
            last_was_page_break = False
            i += 1
            continue

        # Images ![caption](path)
        img_match = re.match(r'^!\[(.*?)\]\((.*?)\)$', line.strip())
        if img_match:
            caption = img_match.group(1).strip()
            img_rel_path = img_match.group(2).strip()
            base_dir = os.path.dirname(md_path)
            full_img_path = os.path.normpath(os.path.join(base_dir, img_rel_path))
            if os.path.exists(full_img_path):
                img_p = doc.add_paragraph()
                img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                img_p.paragraph_format.space_before = Pt(8)
                img_p.paragraph_format.space_after = Pt(2)
                run = img_p.add_run()
                run.add_picture(full_img_path, width=Inches(5.4))
                
                if caption:
                    cap_p = doc.add_paragraph()
                    cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    cap_p.paragraph_format.space_before = Pt(2)
                    cap_p.paragraph_format.space_after = Pt(8)
                    cap_run = cap_p.add_run(caption)
                    cap_run.font.name = 'Times New Roman'
                    cap_run.font.size = Pt(10)
                    cap_run.italic = True
                    cap_run.font.color.rgb = RGBColor(70, 70, 70)
            last_was_page_break = False
            i += 1
            continue

        # Bullet Points
        if line.strip().startswith(('- ', '* ')):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.3
            add_formatted_runs(p, line.strip()[2:].strip(), base_font_size=12)
            last_was_page_break = False
            i += 1
            continue

        # Numbered Lists
        num_match = re.match(r'^(\d+)\.\s+(.*)$', line.strip())
        if num_match:
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.3
            add_formatted_runs(p, num_match.group(2).strip(), base_font_size=12)
            last_was_page_break = False
            i += 1
            continue

        # Standard Body Paragraphs
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.4
        
        if line.startswith('**Under the Guidance of**') or line.startswith('**by**') or 'Fr. Conceicao Rodrigues College of Engineering' in line:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        add_formatted_runs(p, line.strip(), base_font_size=12)
        last_was_page_break = False
        i += 1

    if in_table:
        flush_table()
    if in_code_block:
        flush_code()

    # Save to primary and clean targets
    saved_paths = []
    try:
        doc.save(docx_path)
        saved_paths.append(docx_path)
    except PermissionError:
        print(f"Note: {docx_path} is open in Word, saving to alternative Clean path.")

    clean_path = docx_path.replace('.docx', '_Clean.docx')
    if clean_path != docx_path:
        try:
            doc.save(clean_path)
            saved_paths.append(clean_path)
        except PermissionError:
            pass

    print(f"Successfully generated DOCX report at: {saved_paths}")

if __name__ == '__main__':
    md_file = r"c:\Users\Risa vilas dias\aquatrust-ai\AquaTrustAI\docs\AQUATRUSTAI_FINAL_PROJECT_REPORT.md"
    docx_file = r"c:\Users\Risa vilas dias\aquatrust-ai\AquaTrustAI\docs\AquaTrustAI_Final_Project_Report_Complete.docx"
    parse_markdown_to_docx(md_file, docx_file)
    docx_file_main = r"c:\Users\Risa vilas dias\aquatrust-ai\AquaTrustAI\docs\AquaTrustAI_Final_Project_Report.docx"
    parse_markdown_to_docx(md_file, docx_file_main)
