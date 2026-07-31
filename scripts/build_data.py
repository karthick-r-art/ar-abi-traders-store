import pandas as pd, re, json, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from tamil_converter import fix_tamil

SRC = '/mnt/user-data/uploads/Totallistofproduct.xls'
df = pd.read_excel(SRC, sheet_name='PRODUCT_DETAILS_FULL', header=1)
df = df[df['Code'].notna()].reset_index(drop=True)

def num(x):
    try:
        v = float(x)
        return v if v == v else 0.0
    except: return 0.0

# ---------- Category rules (ordered: first match wins) ----------
CATS = [
 ("Beverages", ["TEA ","TEA[","3ROSES","3 ROSES","COFFEE","BRU","HORLICKS","BOOST","COLA","PEPSI","MAAZA","SLICE","FROOTI","FRUITI","FRUIT DRINK","SODA","KINLEY","WATER","JUICE","BOVONTO","BOVANTO","7UP","SPRITE","THUMS","MIRINDA","BADAM","MILKSHAKE","DAILEE","REDBULL","APPY","JEERA SODA","TANG","RASNA","NARASUS","CHAKRA","COKE","AVT","RED LABEL","TATA TEA","TAJ ","GOLD TEA","GREEN TEA"]),
 ("Dairy & Ghee", ["MILK","CURD","BUTTER"," GHEE","GHEE ","PANEER","CHEESE","DAIRY","NANDHINI","AAVIN","DAHI","LASSI","KOVA"]),
 ("Rice & Atta", ["RICE","ARISI","ATTA","MAIDA","RAVAI","RAVA","SOOJI","WHEAT","FLOUR","IDLY","DOSA","PONNI","SAMBA","BROKEN","IDIYAPPAM","VERMICELLI","SEMIYA","SAMEYA","SEMIA"]),
 ("Dal & Pulses", ["DAL","DHAL","DHALL","THUVARAM","ULUNDHU","PAYARU","KADALAI","GRAM"," MOONG","TOOR","URAD","CHANNA","RAJMA","PEAS","BEANS","POHA","AVAL"]),
 ("Oils", ["OIL","ENNAI","GINGELLY","SUNFLOWER","GROUNDNUT","CASTOR","VANASPATI","DALDA","VVD","IDHAYAM","FORTUNE","GOLD WINNER","SUNDROP","FREEDOM","SAFFOLA","GUINELLY"]),
 ("Masala & Spices", ["MASALA","THOOL","PODI","MILAGAI","MILAGU","MALLI","JEERA","DHANIA","TURMERIC","MANJAL","CHILLI","PEPPER","ELACHI","ELAICHI","CINNAMON"," CIN ","CIN[","SUKKU","SALT","UPPU","HING","GARAM","BIRYANI","SAMBAR","RASAM","VATHAL","VADAGAM","TAMARIND","PULI","KAANJA","KOTHU","MUSTARD","SOMBU","AJINO","BAYLEAF","SUGAR","SARKKARAI","JAGGERY","VELLAM","PICKLE","ACHAR","SUNRISE","AACHI","SAKTHI","NIRAPARA","ASAFOET","PERUNGAYAM","CLOVE","CARDAMOM","KASKAS","SombuU"]),
 ("Chocolates & Candy", ["CHOCO","ECLAIR","KITKAT","MUNCH","FIVESTAR","5STAR","CANDY","MITTAI","TOFFEE","JELLY","LOLLY"," GUM","MELODY","KISMI","RAVALGON","LACTO","POPPIN","MANGO BITE","GEMS","COFFY","CHOCLATE","CHOCOLATE","CHOCLOUSH","CHOCOLUSH"]),
 ("Snacks & Biscuits", ["BISCUIT","MARIE","CAKE","RUSK","CHIPS","KURKURE","MIXTURE","MURUKKU","NAMKEEN","POTAZOS","POPCORN","PUFF","GOOD DAY","GOODDAY","HIDE","BOURBON","CRACKER","NABATI","WAFER","SNACK"," SEV","BUJJA","BUJIA","ALU ","NIPPAT","OATS","CORNFLAKE","BHUJIA","NUT","DATES","KAJU","BADAM ","MANILA","LAYS","APPALAM","JAM","BREAD","VADA","BONDA","PATTIES","BINGO","HALDIRAM"]),
 ("Baby Care", ["PAMPERS","DIAPER","HUGGIES","BABY","CERELAC","LACTOGEN","NAN "]),
 ("Home Care", ["SURF","RIN ","RIN[","TIDE","WHEEL","ARIEL","VIM","PRIL","PHENYL","HARPIC","LIZOL","DETERGENT"," WASH","UJALA","ROBIN","NEEL","ODOMOS","GOODKNIGHT","KNIGHT","MORTEIN"," HIT ","AGARBATHI","VATHI","CAMPHOR","KARPOORAM","MATCH","CANDLE","BROOM","SCRUB","NAPTHALENE","ACID","BLEACH","DUST","MOP"," LIQ","LIQUID","AGARBATTI","SAMBRANI","PARA","DEEPAM","WAX ","EXO","COMFORT","GAIN","MAX","GENTEEL","EZEE","SANIFRESH","COLIN","STICK","MATCHES","MOSQUITO","REFILL","FINISH","GOOD NIGHT"]),
 ("Personal Care", ["SOAP","SHAMPOO","PASTE","BRUSH","DENT","COLGATE","CLOSEUP","LOTION","POND","FAIR","LOVELY","LUX","HAMAM","MEDIMIX","VASELINE","NIVEA","GOKUL","NYCIL","DEO","RAZOR","GILLETTE","HANDWASH","FACEWASH","SANITARY","STAYFREE","WHISPER","COMB","MEHNDI","HENNA","KAJAL","BINDI","POWDER","CREAM","HAIR","TALC","OINTMENT","BALM","VICKS","MOOV","IODEX","COTTON","DABUR","DETTOL","GODREJ","GILLET","CLOSE","HIMALAYA"," HIM","CLINIC","SUNSILK","CHIK","MEERA","VATIKA","PARACHUTE","NIHAR","AMLA","BINDI","KUMKUM","SANITARY","AXE","YARDLEY"," CHIK","DENTAL","SENSODYNE","BABOOL","PROMISE","PEPSOD","ANCHOR"]),
 ("Tobacco & Pan", ["BEEDI","CIGARET","CIGERET","TOBACCO"," PAN ","SUPARI","GUTKA","HANS","CIG ","CIG[","MAWA","ZARDA","KHAINI","PARAG","RAJANIGANDHA","PASS PASS","PAN PARAG","MOUTH","FRESHNER","FRESHENER","MADHU","VIMAL"]),
 ("Stationery & General", ["PEN ","PEN[","PENCIL"," BOOK","ERASER","BATTERY","BULB","LIGHTER","ROPE","THREAD","NOTE","STAPLER","GLUE","TAPE","BALLOON","RAKHI","BINDHU"]),
]


# ---------- Visual product TYPE (for illustration) ----------
TYPES = [
 ("oil",["OIL","ENNAI","GINGELLY","GHEE","DALDA","VANASPATI"]),
 ("rice",["RICE","ARISI","PONNI","BASMATI","BASUMATHI","SAMBA","BOILED"]),
 ("atta",["ATTA","MAIDA","WHEAT","FLOUR","RAVA","RAVAI","SOOJI","BESAN"]),
 ("dal",["DAL","DHAL","DHALL","TOOR","URAD","MOONG","GRAM","KADALAI","PAYARU","RAJMA","CHANNA","ULUNDHU","THUVARAM","PEAS","BEANS"]),
 ("milk",["MILK","DAIRY","NANDHINI","AAVIN","CURD","DAHI","LASSI","PANEER","BUTTER","CHEESE","KOVA"]),
 ("tea",["TEA","3ROSES","3 ROSES","RED LABEL","TAJ ","AVT","GREEN TEA","GOLD TEA","CHAKRA"]),
 ("coffee",["COFFEE","BRU","NESCAFE","FILTER","KAAPI"]),
 ("health",["HORLICKS","BOOST","COMPLAN","BOURNVITA","BADAM","PROTEIN"]),
 ("soda",["COLA","PEPSI","7UP","SPRITE","THUMS","MIRINDA","COKE","BOVONTO","BOVANTO","SODA","FANTA","SLICE","MAAZA","FROOTI","FRUITI","APPY","JUICE","DRINK","TANG","RASNA","REDBULL"]),
 ("water",["WATER","KINLEY","BISLERI","AQUA"]),
 ("biscuit",["BISCUIT","MARIE","GOOD DAY","GOODDAY","HIDE","BOURBON","CRACKER","OREO","RUSK","NABATI","MONACO","KRACKJACK","PARLE","HALDIRAM BIS"]),
 ("cake",["CAKE","PUFF","BREAD","BUN","MUFFIN"]),
 ("chips",["CHIPS","KURKURE","LAYS","BINGO","POTAZOS","POPCORN","WAFER","BUJIA","BUJJA","BHUJIA","MIXTURE","MURUKKU","SEV","NAMKEEN","SNACK","APPALAM","PAPAD","NIPPAT"]),
 ("chocolate",["CHOCO","KITKAT","MUNCH","FIVESTAR","5STAR","DAIRY MILK","GEMS","PERK","CHOCLATE","CHOCOLATE","CHOCLOUSH","CHOCOLUSH"]),
 ("candy",["ECLAIR","CANDY","MITTAI","TOFFEE","JELLY","LOLLY","GUM","MELODY","KISMI","LACTO","POPPIN","MANGO BITE","COFFY","RAVALGON"]),
 ("spice",["MASALA","THOOL","PODI","MILAGAI","CHILLI","TURMERIC","MANJAL","DHANIA","MALLI","JEERA","PEPPER","GARAM","BIRYANI","SAMBAR","RASAM","HING","ASAFOET","PERUNGAYAM","CLOVE","CARDAMOM","ELACHI","ELAICHI","CINNAMON","MUSTARD","SOMBU","KASKAS","VATHAL","VADAGAM"]),
 ("salt",["SALT","UPPU"]),
 ("sugar",["SUGAR","SARKKARAI","JAGGERY","VELLAM"]),
 ("pickle",["PICKLE","ACHAR","THOKKU","TAMARIND","PULI","SAUCE","KETCHUP","JAM","HONEY"]),
 ("noodles",["NOODLE","MAGGI","PASTA","VERMICELLI","SEMIYA","SEMIA","IDIYAPPAM","SPAGHET"]),
 ("soap",["SOAP","LUX","HAMAM","MEDIMIX","LIFEBUOY","MYSORE.SAN","CHANDRIKA","SANTOOR","REXONA","DOVE","CINTHOL"]),
 ("shampoo",["SHAMPOO","CONDITIONER","SUNSILK","CLINIC","HEAD ","DOVE SH"]),
 ("hairoil",["HAIR OIL","PARACHUTE","NIHAR","AMLA","VATIKA","COCONUT OIL","NAVARATNA","BRAHMI"]),
 ("toothpaste",["PASTE","COLGATE","CLOSEUP","PEPSOD","BABOOL","DENT","SENSODYNE","PROMISE","BRUSH"]),
 ("cream",["CREAM","LOTION","POND","FAIR","LOVELY","NIVEA","VASELINE","BALM","VICKS","MOOV","IODEX","TALC","POWDER","NYCIL","BOROLINE","BOROPLUS","DEO","SNOW"]),
 ("detergent",["SURF","RIN ","RIN[","TIDE","WHEEL","ARIEL","DETERGENT","UJALA","NEEL","ROBIN","HENKO","GHADI"]),
 ("dishwash",["VIM","PRIL","EXO","DISHWASH"]),
 ("cleaner",["PHENYL","HARPIC","LIZOL","COLIN","SANIFRESH","ACID","BLEACH","TOILET","FLOOR","GLASS"]),
 ("agarbatti",["AGARBATH","AGARBATT","SAMBRANI","CAMPHOR","KARPOORAM","DEEPAM","DHOOP","INCENSE","VATHI"]),
 ("mosquito",["ODOMOS","GOODKNIGHT","GOOD NIGHT","KNIGHT","MORTEIN","HIT ","MOSQUITO","REPEL","ALLOUT","MAXO"]),
 ("match",["MATCH","LIGHTER","CANDLE","WAX "]),
 ("battery",["BATTERY","CELL","DURACELL","EVEREADY"]),
 ("pen",["PEN ","PEN[","PENCIL","ERASER","SHARPEN","MARKER","SKETCH"]),
 ("book",["BOOK","NOTE","DIARY"]),
 ("baby",["PAMPERS","DIAPER","HUGGIES","BABY","CERELAC","LACTOGEN","NAN "]),
 ("beedi",["BEEDI","CIGARET","CIGERET","TOBACCO","GUTKA","SUPARI","HANS","CIG ","CIG[","MAWA","ZARDA","KHAINI","PAN "]),
 ("nuts",["KAJU","BADAM ","CASHEW","ALMOND","PISTA","DATES","NUTS","DRY FRUIT","RAISIN","KISMIS"]),
 ("egg",["EGG","MUTTAI"]),
 ("balloon",["BALLOON","RAKHI","TOY","GIFT"]),
 ("rope",["ROPE","THREAD","KAYIRU","WIRE","TWINE"]),
]
def infer_type(name):
    u = " " + name.upper() + " "
    for t,keys in TYPES:
        for k in keys:
            if k in u: return t
    return "generic"

def categorize(name):
    u = " " + name.upper() + " "
    for cat, keys in CATS:
        for k in keys:
            if k in u:
                return cat
    return "General Store"

# ---------- Unit / pack inference ----------
def infer_unit(name):
    u = name.upper()
    m = re.search(r'(\d+(?:\.\d+)?)\s?(KG|KGS)\b', u)
    if m: return f"{m.group(1)} kg"
    m = re.search(r'(\d+(?:\.\d+)?)\s?(GRM|GRAM|GMS|GM|G)\b', u)
    if m: return f"{m.group(1)} g"
    m = re.search(r'(\d+(?:\.\d+)?)\s?(LTR|LTRS|LT|L)\b', u)
    if m: return f"{m.group(1)} L"
    m = re.search(r'(\d+(?:\.\d+)?)\s?(ML)\b', u)
    if m: return f"{m.group(1)} ml"
    m = re.search(r'(\d+)\s?(PCS|PC|PIECE)\b', u)
    if m: return f"{m.group(1)} pc"
    for w,lbl in [("CASE","Case"),("BOX","Box"),("BAG","Bag"),("KATTU","Bundle"),("BUNDLE","Bundle"),("SARAM","Strip"),("SAR","Strip"),("PACKET","Packet"),("PKT","Packet"),("POUCH","Pouch"),("JAR","Jar"),("CUP","Cup"),("BOTTLE","Bottle"),("PC","Piece"),("PCS","Piece")]:
        if re.search(r'\b'+w+r'\b', u): return lbl
    return "1 unit"

def infer_pack(name):
    m = re.search(r'[\[\(](\d+)\+?\d*[\]\)]', name)
    return int(m.group(1)) if m else None

products = []
missing_ta = 0
for _, r in df.iterrows():
    name = str(r['Product Name']).strip()
    ta = fix_tamil(r['Tamil Name'])
    if ta and re.search(r'[A-Za-z]', ta): ta = ''   # keep only clean Tamil
    if not ta: missing_ta += 1
    rr, mrp, wr, pr = num(r['RRate']), num(r['MRP']), num(r['WRate']), num(r['PRate'])
    price = rr if rr>0 else (mrp if mrp>0 else (wr if wr>0 else pr))
    compare = mrp if mrp>price else 0
    products.append({
        "id": int(r['Code']),
        "name": name,
        "ta": ta,
        "price": round(price,2),
        "mrp": round(compare,2),
        "wprice": round(wr,2),
        "unit": infer_unit(name),
        "pack": infer_pack(name),
        "cat": categorize(name),
        "type": infer_type(name),
    })

# stock: deterministic pseudo (demo) so it's stable
import hashlib
for p in products:
    h = int(hashlib.md5(str(p['id']).encode()).hexdigest(),16)
    p['stock'] = 0 if h%37==0 else (h%60)+5   # ~2.7% out of stock

products.sort(key=lambda x: x['name'])

from collections import Counter
cc = Counter(p['cat'] for p in products)
print("Total:", len(products), "| missing Tamil:", missing_ta)
print("Priced:", sum(1 for p in products if p['price']>0))
for c,n in cc.most_common(): print(f"  {c:26}{n}")

with open('products.json','w',encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, separators=(',',':'))
print("\nWrote products.json", round(len(open('products.json',encoding='utf-8').read())/1024), "KB")
