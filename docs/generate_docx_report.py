import re
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set padding for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(margin_name)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    """Set background color of a cell."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_borders(cell, color="CCCCCC", sz="4", val="single"):
    """Set light gray borders for table cells."""
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
    """Parses basic markdown bold and italic formatting."""
    # Pattern to match bold (**text**) and italic (*text* or _text_) and inline code (`text`)
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`|\$.*?\$)', text)
    for token in tokens:
        if not token:
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
            run.font.color.rgb = RGBColor(199, 37, 78) # subtle dark red code color
        elif token.startswith('$') and token.endswith('$') and len(token) >= 2:
            run.text = token[1:-1]
            run.font.name = 'Cambria Math'
            run.italic = True
        else:
            run.text = token

def parse_markdown_to_docx(md_path, docx_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    doc = Document()

    # Configure Page Margins (Fr. CRCE guidelines: Left 30mm, Right 20mm, Top 25mm, Bottom 25mm)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.2)   # 30 mm
        section.right_margin = Inches(0.8)  # 20 mm

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(30, 30, 30)

    lines = content.split('\n')
    i = 0
    in_code_block = False
    code_block_lines = []
    
    in_table = False
    table_lines = []

    def flush_table():
        nonlocal in_table, table_lines
        if not table_lines:
            in_table = False
            return
        
        # Parse rows
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
                    
                    set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
                    set_cell_borders(cell, color="CCCCCC", sz="4")

                    if r_idx == 0:
                        set_cell_shading(cell, "2B3E50") # Deep Navy header
                        add_formatted_runs(p, val, base_font_size=10.5)
                        for r in p.runs:
                            r.bold = True
                            r.font.color.rgb = RGBColor(255, 255, 255)
                    else:
                        if r_idx % 2 == 1:
                            set_cell_shading(cell, "F9FAFB") # Very light zebra stripe
                        else:
                            set_cell_shading(cell, "FFFFFF")
                        add_formatted_runs(p, val, base_font_size=10)

            # Spacing after table
            sp = doc.add_paragraph()
            sp.paragraph_format.space_after = Pt(6)

        table_lines = []
        in_table = False

    def flush_code():
        nonlocal in_code_block, code_block_lines
        if not code_block_lines:
            in_code_block = False
            return
        
        table = doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        set_cell_shading(cell, "F3F4F6")
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
        set_cell_borders(cell, color="E5E7EB", sz="6")

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.line_spacing = 1.15

        for line_idx, cline in enumerate(code_block_lines):
            run = p.add_run(cline + ('\n' if line_idx < len(code_block_lines) - 1 else ''))
            run.font.name = 'Consolas'
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(40, 40, 40)

        # Small trailing space
        sp = doc.add_paragraph()
        sp.paragraph_format.space_after = Pt(4)

        code_block_lines = []
        in_code_block = False

    while i < len(lines):
        line = lines[i].rstrip()
        
        # Handle code blocks
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

        # Handle tables
        if line.strip().startswith('|') and line.strip().endswith('|'):
            in_table = True
            table_lines.append(line)
            i += 1
            continue
        elif in_table:
            flush_table()

        # Handle Page Breaks
        if line.strip() in ['\\newpage', '---']:
            doc.add_page_break()
            i += 1
            continue

        # Handle Empty Lines
        if not line.strip():
            i += 1
            continue

        # Handle Headings
        if line.startswith('# '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(12)
            p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, line[2:].strip(), base_font_size=18)
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(15, 34, 64) # Navy Blue
            i += 1
            continue

        if line.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, line[3:].strip(), base_font_size=15)
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(20, 50, 90)
            i += 1
            continue

        if line.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            add_formatted_runs(p, line[4:].strip(), base_font_size=13)
            for r in p.runs:
                r.bold = True
                r.font.color.rgb = RGBColor(30, 41, 59)
            i += 1
            continue

        # Handle Blockquotes / Alerts
        if line.startswith('> '):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.4)
            p.paragraph_format.right_indent = Inches(0.4)
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            add_formatted_runs(p, line[2:].strip(), base_font_size=11, italic_all=True)
            i += 1
            continue

        # Handle Display Math ($$ ... $$)
        if line.strip().startswith('$$') and line.strip().endswith('$$') and len(line.strip()) > 4:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(6)
            math_text = line.strip()[2:-2].strip()
            run = p.add_run(math_text)
            run.font.name = 'Cambria Math'
            run.font.size = Pt(12)
            run.italic = True
            run.font.color.rgb = RGBColor(10, 40, 80)
            i += 1
            continue

        # Handle Images ![caption](path)
        img_match = re.match(r'^!\[(.*?)\]\((.*?)\)$', line.strip())
        if img_match:
            caption = img_match.group(1).strip()
            img_rel_path = img_match.group(2).strip()
            base_dir = os.path.dirname(md_path)
            full_img_path = os.path.normpath(os.path.join(base_dir, img_rel_path))
            if os.path.exists(full_img_path):
                img_p = doc.add_paragraph()
                img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                img_p.paragraph_format.space_before = Pt(10)
                img_p.paragraph_format.space_after = Pt(4)
                run = img_p.add_run()
                run.add_picture(full_img_path, width=Inches(5.6))
                
                if caption:
                    cap_p = doc.add_paragraph()
                    cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    cap_p.paragraph_format.space_before = Pt(2)
                    cap_p.paragraph_format.space_after = Pt(10)
                    cap_run = cap_p.add_run(caption)
                    cap_run.font.name = 'Times New Roman'
                    cap_run.font.size = Pt(10)
                    cap_run.italic = True
                    cap_run.font.color.rgb = RGBColor(60, 60, 60)
            i += 1
            continue

        # Handle Bullet Points
        if line.strip().startswith(('- ', '* ')):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.3
            add_formatted_runs(p, line.strip()[2:].strip(), base_font_size=12)
            i += 1
            continue

        # Handle Numbered Lists
        num_match = re.match(r'^(\d+)\.\s+(.*)$', line.strip())
        if num_match:
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.3
            add_formatted_runs(p, num_match.group(2).strip(), base_font_size=12)
            i += 1
            continue

        # Handle Standard Body Paragraphs
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.4  # ~1.5 line spacing
        
        # Check if line is centered (like title page elements)
        if line.startswith('**Under the Guidance of**') or line.startswith('**by**') or 'Fr. Conceicao Rodrigues College of Engineering' in line:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        add_formatted_runs(p, line.strip(), base_font_size=12)
        i += 1

    # Cleanup final flush
    if in_table:
        flush_table()
    if in_code_block:
        flush_code()

    try:
        doc.save(docx_path)
        print(f"Successfully generated DOCX report at: {docx_path}")
    except PermissionError:
        alt_path = docx_path.replace('.docx', '_Complete.docx')
        doc.save(alt_path)
        print(f"Original file was open in Word; saved updated report with all charts to: {alt_path}")

if __name__ == '__main__':
    md_file = r"c:\Users\Risa vilas dias\aquatrust-ai\AquaTrustAI\docs\AQUATRUSTAI_FINAL_PROJECT_REPORT.md"
    docx_file = r"c:\Users\Risa vilas dias\aquatrust-ai\AquaTrustAI\docs\AquaTrustAI_Final_Project_Report.docx"
    parse_markdown_to_docx(md_file, docx_file)
