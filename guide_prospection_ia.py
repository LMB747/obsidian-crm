"""
Generateur du guide PDF — Prospection IA (Apify + PhantomBuster)
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable,
)
from reportlab.pdfgen import canvas as cv
import os

# ─── Couleurs Obsidian ───────────────────────────────────────────────────────
BG_DARK = HexColor('#0f0e17')
PRIMARY = HexColor('#7c3aed')
PRIMARY_LIGHT = HexColor('#a78bfa')
CYAN = HexColor('#06b6d4')
CYAN_LIGHT = HexColor('#67e8f9')
AMBER = HexColor('#f59e0b')
GREEN = HexColor('#10b981')
RED = HexColor('#ef4444')
SLATE_300 = HexColor('#cbd5e1')
SLATE_400 = HexColor('#94a3b8')
SLATE_500 = HexColor('#64748b')
SLATE_700 = HexColor('#334155')
SLATE_800 = HexColor('#1e293b')
CARD_BG = HexColor('#1a1a2e')
WHITE = white

# ─── Styles ──────────────────────────────────────────────────────────────────
def make_styles():
    s = {}
    s['cover_title'] = ParagraphStyle('cover_title', fontName='Helvetica-Bold', fontSize=28, textColor=WHITE, alignment=TA_CENTER, leading=34)
    s['cover_sub'] = ParagraphStyle('cover_sub', fontName='Helvetica', fontSize=14, textColor=SLATE_400, alignment=TA_CENTER, leading=20)
    s['h1'] = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=20, textColor=PRIMARY_LIGHT, spaceBefore=20, spaceAfter=10, leading=26)
    s['h2'] = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=15, textColor=CYAN_LIGHT, spaceBefore=14, spaceAfter=6, leading=20)
    s['h3'] = ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=12, textColor=AMBER, spaceBefore=10, spaceAfter=4, leading=16)
    s['body'] = ParagraphStyle('body', fontName='Helvetica', fontSize=10, textColor=SLATE_300, leading=15, spaceAfter=4)
    s['body_bold'] = ParagraphStyle('body_bold', fontName='Helvetica-Bold', fontSize=10, textColor=WHITE, leading=15, spaceAfter=4)
    s['bullet'] = ParagraphStyle('bullet', fontName='Helvetica', fontSize=10, textColor=SLATE_300, leading=15, leftIndent=18, bulletIndent=6, spaceAfter=2)
    s['code'] = ParagraphStyle('code', fontName='Courier', fontSize=9, textColor=CYAN_LIGHT, backColor=SLATE_800, leading=13, leftIndent=10, rightIndent=10, spaceBefore=4, spaceAfter=4)
    s['note'] = ParagraphStyle('note', fontName='Helvetica-Oblique', fontSize=9, textColor=AMBER, leading=13, leftIndent=10, spaceBefore=4, spaceAfter=6)
    s['footer'] = ParagraphStyle('footer', fontName='Helvetica', fontSize=8, textColor=SLATE_500, alignment=TA_CENTER)
    s['step_num'] = ParagraphStyle('step_num', fontName='Helvetica-Bold', fontSize=11, textColor=PRIMARY, leading=15)
    return s

ST = make_styles()

# ─── Page background ─────────────────────────────────────────────────────────
def bg_page(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFillColor(BG_DARK)
    canvas_obj.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    # Barre laterale accent
    canvas_obj.setFillColor(PRIMARY)
    canvas_obj.rect(0, 0, 4*mm, A4[1], fill=1, stroke=0)
    # Footer
    canvas_obj.setFillColor(SLATE_500)
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawCentredString(A4[0]/2, 12*mm, f"Obsidian Agency — Guide Prospection IA  |  Page {doc.page}")
    canvas_obj.restoreState()

def bg_cover(canvas_obj, doc):
    canvas_obj.saveState()
    canvas_obj.setFillColor(BG_DARK)
    canvas_obj.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    # Gradient bar top
    canvas_obj.setFillColor(PRIMARY)
    canvas_obj.rect(0, A4[1]-8*mm, A4[0], 8*mm, fill=1, stroke=0)
    # Gradient bar bottom
    canvas_obj.setFillColor(CYAN)
    canvas_obj.rect(0, 0, A4[0], 4*mm, fill=1, stroke=0)
    canvas_obj.restoreState()

# ─── Helpers ─────────────────────────────────────────────────────────────────
def hr():
    return HRFlowable(width="100%", thickness=0.5, color=SLATE_700, spaceBefore=8, spaceAfter=8)

def step(num, text):
    return [
        Paragraph(f'<font color="#{PRIMARY_LIGHT.hexval()[2:]}">{num}.</font> <font color="#ffffff">{text}</font>', ST['body_bold']),
    ]

def bullet(text):
    return Paragraph(f'<bullet>&bull;</bullet> {text}', ST['bullet'])

def info_box(title, lines, color=CYAN):
    """Cree une boite coloree avec titre et lignes."""
    data = [[Paragraph(f'<font color="#{color.hexval()[2:]}"><b>{title}</b></font>', ST['body_bold'])]]
    for line in lines:
        data.append([Paragraph(line, ST['body'])])
    t = Table(data, colWidths=[160*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, color),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    return t

def warning_box(text):
    return info_box("Attention", [text], AMBER)

# ─── CONTENU ─────────────────────────────────────────────────────────────────
def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), 'Guide_Prospection_IA_Obsidian.pdf')
    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=20*mm, rightMargin=15*mm, topMargin=20*mm, bottomMargin=22*mm,
    )
    story = []

    # ── COVER ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 60*mm))
    story.append(Paragraph("OBSIDIAN AGENCY", ST['cover_title']))
    story.append(Spacer(1, 6*mm))
    story.append(Paragraph("Guide Prospection IA", ParagraphStyle('ct2', parent=ST['cover_title'], fontSize=22, textColor=CYAN_LIGHT)))
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph("Apify + PhantomBuster", ParagraphStyle('ct3', parent=ST['cover_sub'], fontSize=16, textColor=PRIMARY_LIGHT)))
    story.append(Spacer(1, 15*mm))
    story.append(Paragraph("Configuration, utilisation et bonnes pratiques", ST['cover_sub']))
    story.append(Spacer(1, 5*mm))
    story.append(Paragraph("pour le module de scraping intelligent", ST['cover_sub']))
    story.append(Spacer(1, 30*mm))
    story.append(hr())
    story.append(Paragraph("v1.0 — Mars 2026", ParagraphStyle('ver', parent=ST['footer'], textColor=SLATE_500)))
    story.append(PageBreak())

    # ── TABLE DES MATIERES ───────────────────────────────────────────────────
    story.append(Paragraph("Table des matieres", ST['h1']))
    story.append(Spacer(1, 4*mm))
    toc_items = [
        ("1.", "Introduction — Comment fonctionne la Prospection IA"),
        ("2.", "Creer un compte Apify (gratuit)"),
        ("3.", "Configurer Apify dans l'application"),
        ("4.", "Creer un compte PhantomBuster"),
        ("5.", "Configurer PhantomBuster dans l'application"),
        ("6.", "Lancer une campagne de scraping"),
        ("7.", "Comprendre les resultats"),
        ("8.", "Importer les prospects dans le CRM"),
        ("9.", "Bonnes pratiques et limites"),
        ("10.", "FAQ — Questions frequentes"),
    ]
    for num, title in toc_items:
        story.append(Paragraph(f'<font color="#{PRIMARY_LIGHT.hexval()[2:]}">{num}</font>  {title}', ST['body']))
    story.append(PageBreak())

    # ── 1. INTRODUCTION ─────────────────────────────────────────────────────
    story.append(Paragraph("1. Introduction", ST['h1']))
    story.append(Paragraph(
        "Le module <b>Prospection IA</b> vous permet de trouver automatiquement "
        "des prospects qualifies sur <b>22 plateformes</b> (LinkedIn, Google Maps, Instagram, "
        "Twitter, GitHub, Malt, etc.) en utilisant deux moteurs de scraping :",
        ST['body']
    ))
    story.append(Spacer(1, 3*mm))

    # Tableau comparatif
    comp_data = [
        [Paragraph('<b>Critere</b>', ST['body_bold']),
         Paragraph('<font color="#a78bfa"><b>Apify</b></font>', ST['body_bold']),
         Paragraph('<font color="#67e8f9"><b>PhantomBuster</b></font>', ST['body_bold'])],
        [Paragraph('Type', ST['body']),
         Paragraph('Actors publics (marketplace)', ST['body']),
         Paragraph('Phantoms pre-configures', ST['body'])],
        [Paragraph('Configuration', ST['body']),
         Paragraph('Cle API + lancement auto', ST['body']),
         Paragraph('Cle API + Agent ID', ST['body'])],
        [Paragraph('Prix', ST['body']),
         Paragraph('Gratuit (5$/mois credit)', ST['body']),
         Paragraph('Essai gratuit, puis payant', ST['body'])],
        [Paragraph('Ideal pour', ST['body']),
         Paragraph('Google Search, Maps, multi-plateforme', ST['body']),
         Paragraph('LinkedIn, Instagram (navigation reelle)', ST['body'])],
        [Paragraph('Vitesse', ST['body']),
         Paragraph('Rapide (30-60s)', ST['body']),
         Paragraph('Plus lent (1-2 min)', ST['body'])],
    ]
    comp_table = Table(comp_data, colWidths=[35*mm, 60*mm, 60*mm])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SLATE_800),
        ('BACKGROUND', (0,1), (-1,-1), CARD_BG),
        ('TEXTCOLOR', (0,0), (-1,-1), SLATE_300),
        ('BOX', (0,0), (-1,-1), 1, SLATE_700),
        ('INNERGRID', (0,0), (-1,-1), 0.5, SLATE_700),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 4*mm))

    story.append(info_box("Comment ca marche ?", [
        "1. Vous configurez votre cle API (Apify et/ou PhantomBuster)",
        "2. Vous lancez une campagne avec vos mots-cles et plateformes",
        "3. Le moteur scrape les plateformes en arriere-plan",
        "4. Les prospects sont automatiquement ajoutes a votre liste",
        "5. Vous importez les meilleurs prospects dans votre CRM principal",
    ]))
    story.append(PageBreak())

    # ── 2. CREER UN COMPTE APIFY ─────────────────────────────────────────────
    story.append(Paragraph("2. Creer un compte Apify (gratuit)", ST['h1']))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("Etape 1 — Inscription", ST['h3']))
    story.append(bullet("Allez sur <b>https://apify.com</b>"))
    story.append(bullet("Cliquez sur <b>Sign up free</b>"))
    story.append(bullet("Connectez-vous avec Google ou creez un compte email"))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("Etape 2 — Recuperer votre cle API", ST['h3']))
    story.append(bullet("Une fois connecte, allez dans <b>Settings</b> (icone engrenage)"))
    story.append(bullet("Cliquez sur <b>Integrations</b> dans le menu de gauche"))
    story.append(bullet("Vous verrez votre <b>API Token</b> (commence par <font name='Courier' color='#67e8f9'>apify_api_</font>)"))
    story.append(bullet("Cliquez sur l'icone copier pour le copier"))
    story.append(Spacer(1, 3*mm))

    story.append(info_box("Offre gratuite Apify", [
        "Le plan gratuit inclut <b>5$ de credit/mois</b>, soit environ :",
        "- 1 000 resultats Google Search",
        "- 500 resultats Google Maps",
        "- Largement suffisant pour debuter !",
    ], GREEN))
    story.append(Spacer(1, 3*mm))

    story.append(warning_box(
        "Ne partagez jamais votre cle API. Elle donne acces a votre compte Apify. "
        "Vous pouvez la regenerer a tout moment dans Settings > Integrations."
    ))
    story.append(PageBreak())

    # ── 3. CONFIGURER APIFY ──────────────────────────────────────────────────
    story.append(Paragraph("3. Configurer Apify dans l'application", ST['h1']))
    story.append(Spacer(1, 2*mm))

    for i, (title, desc) in enumerate([
        ("Ouvrir la Configuration", "Dans le menu, cliquez sur <b>Prospection IA</b>, puis l'onglet <b>Configuration</b>."),
        ("Coller votre cle API", "Dans le champ <b>Apify API Token</b>, collez votre cle (<font name='Courier' color='#67e8f9'>apify_api_xxx...</font>)."),
        ("Actor ID personnalise (optionnel)", "Par defaut, l'app utilise <b>Google Search Scraper</b> pour toutes les plateformes. "
         "Si vous avez un acteur Apify specifique, entrez son ID dans le champ <b>Actor ID personnalise</b>."),
        ("Sauvegarder", "Cliquez sur le bouton <b>Sauvegarder</b>. Un message de confirmation apparait."),
    ], 1):
        story.extend(step(i, title))
        story.append(Paragraph(desc, ST['body']))
        story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 3*mm))
    story.append(info_box("Fonctionnement Apify dans l'app", [
        "Apify utilise le <b>Google Search Scraper</b> comme moteur universel.",
        "Chaque plateforme est convertie en requete Google ciblee :",
        '- LinkedIn -> <font name="Courier" color="#67e8f9">site:linkedin.com/in agence web Paris</font>',
        '- Instagram -> <font name="Courier" color="#67e8f9">site:instagram.com designer UX</font>',
        '- Google Maps utilise un acteur dedie (Places Scraper)',
    ], PRIMARY))
    story.append(PageBreak())

    # ── 4. CREER UN COMPTE PHANTOMBUSTER ─────────────────────────────────────
    story.append(Paragraph("4. Creer un compte PhantomBuster", ST['h1']))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("Etape 1 — Inscription", ST['h3']))
    story.append(bullet("Allez sur <b>https://phantombuster.com</b>"))
    story.append(bullet("Cliquez sur <b>Start free trial</b>"))
    story.append(bullet("Creez votre compte (14 jours d'essai gratuit)"))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("Etape 2 — Recuperer votre cle API", ST['h3']))
    story.append(bullet("Connectez-vous a PhantomBuster"))
    story.append(bullet("Cliquez sur votre avatar en haut a droite > <b>Settings</b>"))
    story.append(bullet("Dans la section <b>API keys</b>, cliquez sur <b>Create new key</b>"))
    story.append(bullet("Copiez la cle generee (longue chaine alphanunerique)"))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("Etape 3 — Creer un Phantom", ST['h3']))
    story.append(Paragraph(
        "Contrairement a Apify, PhantomBuster necessite que vous configuriez un <b>Phantom</b> "
        "(un robot d'automatisation) dans votre dashboard avant de l'utiliser dans l'app.",
        ST['body']
    ))
    story.append(Spacer(1, 2*mm))

    story.append(bullet("Allez dans <b>Phantoms</b> > <b>Add a Phantom</b>"))
    story.append(bullet("Cherchez un Phantom adapte, par exemple :"))

    phantom_data = [
        [Paragraph('<b>Phantom</b>', ST['body_bold']), Paragraph('<b>Usage</b>', ST['body_bold'])],
        [Paragraph('LinkedIn Search Export', ST['body']), Paragraph('Exporter des profils depuis une recherche LinkedIn', ST['body'])],
        [Paragraph('LinkedIn Profile Scraper', ST['body']), Paragraph('Scraper les details d\'un profil LinkedIn', ST['body'])],
        [Paragraph('Google Maps Search Export', ST['body']), Paragraph('Trouver des entreprises sur Google Maps', ST['body'])],
        [Paragraph('Instagram Profile Scraper', ST['body']), Paragraph('Extraire les infos d\'un profil Instagram', ST['body'])],
        [Paragraph('Sales Navigator Search', ST['body']), Paragraph('Export de leads depuis Sales Navigator', ST['body'])],
    ]
    phantom_table = Table(phantom_data, colWidths=[60*mm, 100*mm])
    phantom_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SLATE_800),
        ('BACKGROUND', (0,1), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, CYAN),
        ('INNERGRID', (0,0), (-1,-1), 0.5, SLATE_700),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(phantom_table)
    story.append(Spacer(1, 3*mm))

    story.append(bullet("Configurez le Phantom selon vos besoins (URL de recherche, nombre de resultats, etc.)"))
    story.append(bullet("Notez l'<b>Agent ID</b> (visible dans l'URL : <font name='Courier' color='#67e8f9'>phantombuster.com/phantoms/<b>1234567890</b>/setup</font>)"))
    story.append(PageBreak())

    # ── 5. CONFIGURER PHANTOMBUSTER ──────────────────────────────────────────
    story.append(Paragraph("5. Configurer PhantomBuster dans l'app", ST['h1']))
    story.append(Spacer(1, 2*mm))

    for i, (title, desc) in enumerate([
        ("Ouvrir la Configuration", "Dans <b>Prospection IA</b> > onglet <b>Configuration</b>."),
        ("Coller votre cle API", "Dans le champ <b>PhantomBuster API Key</b>, collez votre cle."),
        ("Recuperer vos Phantoms", "Cliquez sur le bouton <b>Recuperer mes Phantoms</b>. "
         "La liste de vos Phantoms configures apparait."),
        ("Selectionner un Phantom", "Cliquez sur le Phantom que vous souhaitez utiliser. "
         "Son <b>Agent ID</b> se remplit automatiquement."),
        ("Sauvegarder", "Cliquez sur <b>Sauvegarder</b>."),
    ], 1):
        story.extend(step(i, title))
        story.append(Paragraph(desc, ST['body']))
        story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 3*mm))
    story.append(warning_box(
        "Le bouton 'Recuperer mes Phantoms' ne fonctionne que si votre cle API est deja saisie. "
        "Entrez d'abord la cle, puis cliquez sur le bouton."
    ))
    story.append(PageBreak())

    # ── 6. LANCER UNE CAMPAGNE ───────────────────────────────────────────────
    story.append(Paragraph("6. Lancer une campagne de scraping", ST['h1']))
    story.append(Spacer(1, 2*mm))

    for i, (title, desc) in enumerate([
        ("Ouvrir le Scraper IA", "Dans <b>Prospection IA</b>, restez sur l'onglet <b>Scraper IA</b>."),
        ("Nouvelle Campagne", "Cliquez sur le bouton violet <b>Nouvelle Campagne de Scraping</b>."),
        ("Choisir les plateformes", "Selectionnez une ou plusieurs plateformes (LinkedIn, Google Maps, Instagram, etc.). "
         "Chaque plateforme selectionnee s'illumine en violet."),
        ("Entrer les mots-cles", "Tapez vos mots-cles separes par des virgules. "
         "Exemple : <font name='Courier' color='#67e8f9'>agence web, developpeur React, designer UX</font>"),
        ("Choisir le moteur", "Si vous avez configure les deux services, un selecteur <b>Apify / PhantomBuster</b> apparait. "
         "Choisissez le moteur adapte a votre recherche."),
        ("Filtres optionnels", "Remplissez la localisation, le secteur, la taille d'entreprise ou le poste cible."),
        ("Lancer !", "Cliquez sur <b>Lancer le Scraping</b>. La barre de progression apparait."),
    ], 1):
        story.extend(step(i, title))
        story.append(Paragraph(desc, ST['body']))
        story.append(Spacer(1, 1.5*mm))

    story.append(Spacer(1, 3*mm))
    story.append(info_box("Quel moteur choisir ?", [
        "<b>Apify</b> : ideal pour Google Search, Google Maps, et recherches multi-plateformes rapides.",
        "<b>PhantomBuster</b> : ideal pour LinkedIn (navigation reelle avec cookies), Instagram pro, et Sales Navigator.",
        "Si aucune cle n'est configuree, l'app fonctionne en <b>mode demo</b> avec des donnees fictives.",
    ], PRIMARY))
    story.append(PageBreak())

    # ── 7. COMPRENDRE LES RESULTATS ──────────────────────────────────────────
    story.append(Paragraph("7. Comprendre les resultats", ST['h1']))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph(
        "Une fois la campagne terminee, les prospects sont ajoutes a l'onglet <b>Prospects</b>. "
        "Chaque prospect contient les informations suivantes :",
        ST['body']
    ))
    story.append(Spacer(1, 2*mm))

    fields_data = [
        [Paragraph('<b>Champ</b>', ST['body_bold']), Paragraph('<b>Description</b>', ST['body_bold'])],
        [Paragraph('Nom / Prenom', ST['body']), Paragraph('Identite du prospect', ST['body'])],
        [Paragraph('Entreprise', ST['body']), Paragraph('Nom de l\'entreprise ou du compte', ST['body'])],
        [Paragraph('Poste', ST['body']), Paragraph('Titre professionnel (CEO, Fondateur, etc.)', ST['body'])],
        [Paragraph('Email / Telephone', ST['body']), Paragraph('Coordonnees (si disponibles publiquement)', ST['body'])],
        [Paragraph('Ville / Pays', ST['body']), Paragraph('Localisation geographique', ST['body'])],
        [Paragraph('Source', ST['body']), Paragraph('Plateforme d\'origine (LinkedIn, Google Maps, etc.)', ST['body'])],
        [Paragraph('Score', ST['body']), Paragraph('Score de qualification 0-100 (plus c\'est haut, plus c\'est qualifie)', ST['body'])],
        [Paragraph('Intention d\'achat', ST['body']), Paragraph('Faible / Moyenne / Forte', ST['body'])],
        [Paragraph('Tags', ST['body']), Paragraph('Etiquettes auto-generees (mots-cles, ville, etc.)', ST['body'])],
    ]
    fields_table = Table(fields_data, colWidths=[45*mm, 115*mm])
    fields_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SLATE_800),
        ('BACKGROUND', (0,1), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, SLATE_700),
        ('INNERGRID', (0,0), (-1,-1), 0.5, SLATE_700),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(fields_table)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("Statuts des campagnes", ST['h2']))
    story.append(bullet('<font color="#10b981"><b>Completed</b></font> — La campagne est terminee avec succes'))
    story.append(bullet('<font color="#ef4444"><b>Error</b></font> — Une erreur s\'est produite (verifiez le message d\'erreur)'))
    story.append(bullet('<font color="#a78bfa"><b>Running</b></font> — La campagne est en cours (barre de progression visible)'))
    story.append(PageBreak())

    # ── 8. IMPORTER DANS LE CRM ──────────────────────────────────────────────
    story.append(Paragraph("8. Importer les prospects dans le CRM", ST['h1']))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph(
        "Les prospects trouves par le scraper sont dans un espace separe. "
        "Pour les utiliser dans votre CRM principal (Clients CRM), vous devez les importer :",
        ST['body']
    ))
    story.append(Spacer(1, 2*mm))

    for i, (title, desc) in enumerate([
        ("Ouvrir l'onglet Prospects", "Dans <b>Prospection IA</b> > onglet <b>Prospects</b>."),
        ("Selectionner les prospects", "Cochez les prospects que vous voulez importer, ou utilisez les filtres pour affiner."),
        ("Importer", "Cliquez sur le bouton <b>Importer dans le CRM</b>. Les prospects sont copies dans Clients CRM avec le statut 'Prospect'."),
    ], 1):
        story.extend(step(i, title))
        story.append(Paragraph(desc, ST['body']))
        story.append(Spacer(1, 2*mm))

    story.append(Spacer(1, 3*mm))
    story.append(info_box("Pipeline de prospection", [
        "Utilisez l'onglet <b>Pipeline</b> pour suivre vos prospects dans un Kanban :",
        "Identifie -> Contacte -> En discussion -> Proposition envoyee -> Signe",
        "Glissez-deposez les cartes pour mettre a jour le statut.",
    ], GREEN))
    story.append(PageBreak())

    # ── 9. BONNES PRATIQUES ──────────────────────────────────────────────────
    story.append(Paragraph("9. Bonnes pratiques et limites", ST['h1']))
    story.append(Spacer(1, 2*mm))

    story.append(Paragraph("A faire", ST['h2']))
    story.append(bullet("Commencez avec <b>1-2 plateformes</b> pour tester avant de lancer sur 10+"))
    story.append(bullet("Utilisez des <b>mots-cles precis</b> : 'agence web Paris' > 'agence'"))
    story.append(bullet("Verifiez vos <b>resultats</b> avant d'importer dans le CRM"))
    story.append(bullet("Respectez les <b>limites des API</b> (quotas Apify, temps d'execution PhantomBuster)"))
    story.append(bullet("Sauvegardez votre configuration avant de lancer une campagne"))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph("A eviter", ST['h2']))
    story.append(bullet("Ne lancez pas <b>trop de campagnes simultanees</b> (risque de quota depasse)"))
    story.append(bullet("Ne scrapez pas sans <b>mots-cles</b> (resultats non pertinents)"))
    story.append(bullet("Ne partagez <b>jamais vos cles API</b>"))
    story.append(bullet("N'ignorez pas les <b>messages d'erreur</b> — ils contiennent des infos utiles"))
    story.append(Spacer(1, 3*mm))

    story.append(Paragraph("Limites techniques", ST['h2']))
    limits_data = [
        [Paragraph('<b>Limite</b>', ST['body_bold']), Paragraph('<b>Apify</b>', ST['body_bold']), Paragraph('<b>PhantomBuster</b>', ST['body_bold'])],
        [Paragraph('Timeout', ST['body']), Paragraph('60 secondes', ST['body']), Paragraph('2 minutes', ST['body'])],
        [Paragraph('Resultats max', ST['body']), Paragraph('~30 par plateforme', ST['body']), Paragraph('Depend du Phantom', ST['body'])],
        [Paragraph('Quota gratuit', ST['body']), Paragraph('5$/mois', ST['body']), Paragraph('14 jours d\'essai', ST['body'])],
        [Paragraph('Plateformes', ST['body']), Paragraph('22 via Google Search', ST['body']), Paragraph('LinkedIn, Instagram, etc.', ST['body'])],
    ]
    limits_table = Table(limits_data, colWidths=[40*mm, 55*mm, 60*mm])
    limits_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SLATE_800),
        ('BACKGROUND', (0,1), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, SLATE_700),
        ('INNERGRID', (0,0), (-1,-1), 0.5, SLATE_700),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(limits_table)
    story.append(PageBreak())

    # ── 10. FAQ ──────────────────────────────────────────────────────────────
    story.append(Paragraph("10. FAQ — Questions frequentes", ST['h1']))
    story.append(Spacer(1, 2*mm))

    faqs = [
        ("La campagne affiche 'Error: Failed to fetch'",
         "Cela signifie que l'API n'est pas accessible. Verifiez votre connexion internet "
         "et que votre cle API est correcte. Si vous etes en local, deployez sur Netlify "
         "ou utilisez 'npx netlify dev' pour que le proxy fonctionne."),
        ("La campagne se termine mais avec 0 resultats",
         "Vos mots-cles sont peut-etre trop specifiques, ou la plateforme n'a pas retourne "
         "de donnees. Essayez avec des termes plus generiques ou une autre plateforme."),
        ("'Aucun Phantom Agent ID configure'",
         "Vous avez choisi PhantomBuster comme moteur mais n'avez pas configure d'Agent ID. "
         "Allez dans Configuration, entrez votre cle PhantomBuster, cliquez sur "
         "'Recuperer mes Phantoms', selectionnez-en un, puis sauvegardez."),
        ("Puis-je utiliser les deux moteurs en meme temps ?",
         "Non, chaque campagne utilise un seul moteur. Mais vous pouvez lancer une campagne "
         "avec Apify et une autre avec PhantomBuster — les resultats se cumulent."),
        ("Les donnees sont-elles sauvegardees ?",
         "Oui, tout est sauvegarde localement dans votre navigateur (localStorage). "
         "Vos prospects, campagnes et cles API persistent entre les sessions."),
        ("Comment supprimer une campagne ?",
         "Dans l'onglet Jobs, cliquez sur l'icone poubelle a cote de la campagne. "
         "Vous pouvez aussi utiliser 'Supprimer les jobs vides' ou 'Tout supprimer'."),
        ("Le mode demo genere quoi exactement ?",
         "Si aucune cle API n'est configuree, le scraper genere 10 a 25 prospects fictifs "
         "realistes (noms francais, emails, entreprises) pour vous permettre de tester l'interface."),
    ]
    for q, a in faqs:
        story.append(Paragraph(f'<font color="#{WHITE.hexval()[2:]}"><b>Q : {q}</b></font>', ST['body_bold']))
        story.append(Paragraph(f'R : {a}', ST['body']))
        story.append(Spacer(1, 3*mm))

    # ── FIN ──────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 10*mm))
    story.append(hr())
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Obsidian Agency CRM — Prospection IA", ParagraphStyle('end', parent=ST['cover_sub'], fontSize=12)))
    story.append(Paragraph("Guide genere automatiquement — v1.0 Mars 2026", ST['footer']))

    # Build
    doc.build(story, onFirstPage=bg_cover, onLaterPages=bg_page)
    return output_path

if __name__ == '__main__':
    path = build_pdf()
    print(f"PDF genere : {path}")
