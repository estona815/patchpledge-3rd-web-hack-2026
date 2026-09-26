from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "PatchPledge-pitch.pdf"
W, H = 960, 540
BLUE, NAVY, MUTED, LIME, LINE = [HexColor(v) for v in ("#115BFF", "#101A33", "#65738B", "#B4F23E", "#D5DEEC")]

def text(c, x, y, value, size=16, color=NAVY, bold=False):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, value)

def base(c, number, kicker, title):
    c.setFillColor(HexColor("#F8FAFF"))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    text(c, 54, 488, "Patch", 24, NAVY, True)
    text(c, 123, 488, "Pledge", 24, BLUE, True)
    c.setStrokeColor(LINE); c.line(54, 468, W-54, 468)
    text(c, 54, 429, kicker.upper(), 12, BLUE, True)
    text(c, 54, 374, title, 35, NAVY, True)
    c.setStrokeColor(LINE); c.line(54, 42, W-54, 42)
    text(c, 54, 24, "3rd-Web-Hack  |  Local EVM prototype  |  chain 1337", 10, MUTED)
    text(c, W-75, 24, f"0{number}", 10, MUTED)

def card(c, x, y, width, title, lines, accent=False):
    c.setFillColor(HexColor("#FFFFFF")); c.setStrokeColor(LINE)
    c.roundRect(x, y, width, 205, 7, fill=1, stroke=1)
    c.setFillColor(LIME if accent else BLUE); c.rect(x+20, y+160, 20, 4, fill=1, stroke=0)
    text(c, x+20, y+126, title, 19, NAVY, True)
    for i, line in enumerate(lines): text(c, x+20, y+92-i*25, line, 13, MUTED)

c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
base(c, 1, "The opportunity", "Turn a promise into a funded fix.")
text(c, 54, 330, "Issue boards describe work. Funding and completion evidence often stay in separate conversations.", 15, MUTED)
card(c, 54, 85, 407, "For contributors", ["See a committed budget before starting.", "Anchor a proof of work by hash.", "Receive payment after two approvals."], True)
card(c, 480, 85, 407, "For sponsors", ["Lock funds against a specific task.", "Use independent reviewers.", "Recover unsettled funds after expiry."])
c.showPage()
base(c, 2, "The workflow", "Escrow. Evidence. Consensus. Payout.")
steps = [("01", "Open", "Sponsor locks demo ETH", "with a task hash."), ("02", "Submit", "Worker commits evidence", "by its Keccak-256 hash."), ("03", "Review", "Two distinct reviewers", "approve one time each."), ("04", "Settle", "Contract pays worker or", "refunds after expiry.")]
for i, (n, title, a, b) in enumerate(steps):
    x = 54+i*213
    c.setFillColor(HexColor("#FFFFFF")); c.setStrokeColor(LINE); c.roundRect(x, 153, 194, 172, 7, fill=1, stroke=1)
    text(c, x+16, 288, n, 11, BLUE, True); text(c, x+16, 246, title, 21, NAVY, True)
    text(c, x+16, 205, a, 12, MUTED); text(c, x+16, 183, b, 12, MUTED)
text(c, 54, 96, "Smart-contract rules enforce the settlement; the interface displays the resulting transactions and balance.", 14, NAVY)
c.showPage()
base(c, 3, "Working prototype", "Real local transactions. Honest scope.")
card(c, 54, 130, 407, "Built and verified", ["Solidity + ethers v6 + Ganache", "Node.js + semantic browser UI", "Payout and refund integration tests"], True)
card(c, 480, 130, 407, "Next steps", ["Wallet-signed public testnet", "Durable task and evidence links", "Dispute process + contract audit"])
text(c, 54, 91, "This MVP runs only on an ephemeral chain. Demo ETH has no real-world value; no public deployment or audit.", 12, MUTED)
text(c, 54, 70, "Developed with Codex assistance. Source and reproducible local run instructions are in the public repository.", 12, MUTED)
c.showPage(); c.save()
print(OUT)
