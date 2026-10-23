"""Build the fast UI subset; the unmodified full font remains a rare-glyph fallback.
Requires fontTools and Brotli. Source: adobe-fonts/source-han-serif, release branch.
"""
from pathlib import Path
import argparse
from fontTools import subset
from fontTools.ttLib import TTFont
parser=argparse.ArgumentParser()
parser.add_argument('source',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
font=TTFont(args.source)
available=set(font.getBestCmap())
chars=set(range(0x20,0x300))|set(range(0x2000,0x2070))|set(range(0x3000,0x3040))|set(range(0xff00,0xfff0))
for first in range(0xa1,0xf8):
 for second in range(0xa1,0xff):
  try: chars.update(map(ord,bytes((first,second)).decode('gb2312')))
  except UnicodeDecodeError: pass
for directory in ['app','lib']:
 for path in (root/directory).rglob('*'):
  if path.suffix in ['.tsx','.ts','.css']:chars.update(map(ord,path.read_text()))
chars &= available
options=subset.Options()
options.layout_features=['*']
options.name_IDs=['*']
options.name_legacy=True
options.name_languages=['*']
subsetter=subset.Subsetter(options=options)
subsetter.populate(unicodes=chars)
subsetter.subset(font)
# Reserved upstream names are retained only in copyright/license metadata.
for record in font['name'].names:
 if record.nameID in [1,3,4,6,16,21,25]:
  replacement={1:'Workspace Serif',3:'WorkspaceSerif-Subset-2.003',4:'Workspace Serif',6:'WorkspaceSerif',16:'Workspace Serif',21:'Workspace Serif',25:'WorkspaceSerif'}[record.nameID]
  font['name'].setName(replacement,record.nameID,record.platformID,record.platEncID,record.langID)
font.flavor='woff2'
out=root/'public/fonts/source-han-serif-sc-vf-ui.woff2'
font.save(out)
points=sorted(font.getBestCmap())
ranges=[]
for point in points:
 if ranges and point==ranges[-1][1]+1:ranges[-1][1]=point
 else:ranges.append([point,point])
unicode=','.join(f'U+{a:X}'+(f'-{b:X}' if a!=b else '') for a,b in ranges)
css='''/* Source Han Serif SC VF 2.003, Adobe; SIL OFL, see fonts/SourceHanSerif-LICENSE.txt.
   The common/UI face is preferred; other glyphs use the complete original face. */
@font-face {
 font-family: "Workspace Serif";
 src: url("/fonts/source-han-serif-sc-vf-full.woff2") format("woff2");
 font-weight: 250 900;
 font-style: normal;
 font-display: swap;
}
@font-face {
 font-family: "Workspace Serif";
 src: url("/fonts/source-han-serif-sc-vf-ui.woff2") format("woff2");
 font-weight: 250 900;
 font-style: normal;
 font-display: swap;
 unicode-range: '''+unicode+''';
}
'''
(root/'app/serif-font.css').write_text(css)
print({'font':out.name,'bytes':out.stat().st_size,'characters':len(points),'axes':[(a.axisTag,a.minValue,a.maxValue) for a in font['fvar'].axes]})
