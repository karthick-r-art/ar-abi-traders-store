import re
from tamil import txt2unicode as _T
_b = _T.bamini2unicode
U,UU='\u0BC1','\u0BC2'; E,EE,AI='\u0BC6','\u0BC7','\u0BC8'; O,OO='\u0BCA','\u0BCB'
CONS = r'yrtwszfgjklqedoa\]\\'
C='(['+CONS+r'])'
def fix_tamil(raw):
    if raw is None: return ''
    s=str(raw)
    if s.strip().lower() in ('nan',''): return ''
    # split vowels first (lead + consonant + trailing 'h'=ா)  => ொ / ோ
    s=re.sub(r'b'+C+r'h', r'\1'+'\x12', s)   # ொ
    s=re.sub(r'B'+C+r'h', r'\1'+'\x13', s)   # ோ
    # simple pre-base vowels
    s=re.sub(r'b'+C, r'\1'+'\x0e', s)        # ெ
    s=re.sub(r'B'+C, r'\1'+'\x0f', s)        # ே
    s=re.sub(r'I'+C, r'\1'+'\x10', s)        # ை
    # shop glyphs
    s=s.replace('%','\x01').replace('!;','\x02').replace('!','\x03')
    s=s.replace('~;','\x04').replace('~','\x05').replace('[','\x06').replace('{','\x07')
    s=re.sub(r'(^|[\s(])O($|[\s)])', r'\1'+'\x11'+r'\2', s)
    out=_b(s)
    for k,v in {'\x01':'₹','\x02':'ஸ்','\x03':'ஸ','\x04':'ஞ்','\x05':'ஞ','\x06':U,'\x07':UU,
                '\x0e':E,'\x0f':EE,'\x10':AI,'\x11':'டீ','\x12':O,'\x13':OO}.items():
        out=out.replace(k,v)
    # safe cleanup: bare consonant followed by stray latin matra
    out=re.sub(r'([\u0B95-\u0BB9])h', r'\1ா', out)
    out=re.sub(r'([\u0B95-\u0BB9])p', r'\1ி', out)
    return ' '.join(out.split()).strip()
