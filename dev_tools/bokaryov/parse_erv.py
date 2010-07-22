# coding: utf-8

import json, glob,codecs, re
from xml.etree.ElementTree import ElementTree
import array
    
x_script = {    
    u"ĝ":u"gx",
    u"ĉ":u"cx",
    u"ĵ":u"jx",
    u"ŝ":u"sx",
    u"ĥ":u"hx",    
    u"ŭ":u"ux"
}
   

class Machine:
    word = None
    wordBase = None
    definition = None
    entry = ""
    in_comment = False
    kstart = 0
    headless = False
    in_def = False
    in_ex = False
    in_arrow = False
    skipping = False
    
    @classmethod
    def toggle_comment(cls, x):
        cls.in_comment = not cls.in_comment
        return "<co>" if cls.in_comment else "</co>"

    @classmethod
    def begin_ex(cls, x):
        cls.in_ex = True
        return "<ex>"

    @classmethod
    def end_ex(cls, x):
        cls.in_ex = False
        return "</ex>"

    @classmethod
    def begin_key(cls, x):
        cls.kstart = len(cls.entry)+3
        return "<k>"

    @classmethod
    def end_key(cls, x):
        cls.entry = cls.entry.split("@")[0]
        cls.word = cls.entry[cls.kstart:]
        cls.word = cls.word.replace("*","")
        if "~" in cls.word:
            a = cls.word
            cls.word = cls.word.replace(r"\~", cls.wordBase[1:])
            cls.word = cls.word.replace("~", cls.wordBase)
        elif cls.wordBase == "":
            cls.wordBase = cls.word.split("|")[0]
        cls.word = cls.word.replace("|","")
        cls.word = cls.word.replace(", ","</k>, <k>")
        cls.entry = cls.entry[0:cls.kstart]+cls.word
        cls.skipping = False
        return "</k>"

    #~ @classmethod
    #~ def subst_is_headless(cls, x):
        #~ cls.headless = True
        #~ return ""

    #~ @classmethod
    #~ def subst_base(cls, x):
        #~ res = cls.wordBase
        #~ if cls.headless:
            #~ res = res[1:]
        #~ cls.headless = False
        #~ return res

    @classmethod
    def process_line(cls, line):
        if not line.startswith(" "):
            if (not cls.in_ex) and cls.in_def:
                cls.entry+="</def>"
                cls.in_def = False
        if line=="":
            cls.word = ""
            print >>sink, "<ar>"+cls.entry+"</ar>"
            cls.entry =""
            cls.wordBase =""
        else:
            pass
            if cls.entry:
                cls.entry += " "
        for c in line:
            if (not cls.skipping) or c=="]":
                if c in char2action:
                    token = char2action[c](c)
                else:
                    token = c
                cls.entry += token
            #~ print cls.skipping, cls.entry.encode("cp1251","replace")
            if c!="=":
                cls.in_arrow = False
            
    @classmethod
    def start_def(cls, line):
        if cls.in_def:
            return "</def><def>"
        cls.in_def = True
        return "<def>"
        
    @classmethod
    def arrow(cls, line):
        cls.in_arrow = True
        return "=" 
        
    @classmethod
    def endref(cls, line):
        return "&gt;" if cls.in_arrow else "</kref>"
               
    @classmethod
    def skip_ref(cls, line):
        cls.skipping = True
        return ""            
        

char2action = {
    "[": Machine.begin_key,
    "]": Machine.end_key,
    "_": Machine.toggle_comment,
    "/": lambda x:"",
    "{": Machine.begin_ex,
    "}": Machine.end_ex,
    "<": lambda x:"<kref>",
    ">": Machine.endref,
    #~ "\\": Machine.subst_is_headless,
    "=": Machine.arrow,
    #~ "~": Machine.subst_base,
    "#": Machine.start_def,
    "@": Machine.skip_ref
}

def recircumflex(s):
    for cir, cx in x_script.iteritems():
        s = s.replace(cx, cir)
        s = s.replace(cx.capitalize(), cir.upper())
        s = s.replace(cx.upper(), cir.upper())
    
        
    out = array.array("u")
    stress = False
    for c in s:
        if c=="`":
            stress = True
        else:
            out.append(unicode(c))
            if stress:
                out.append(u"́")
                stress = False
                
    return out.tounicode()


sink = codecs.open("out.xml","wt","utf-8")
print >>sink, """<xdxf lang_from="eo" lang_to="ru" format="l">"""


for fn in glob.glob("*.txt"):
    c = 0
    for line in open(fn):
        assert("&" not in line)
        Machine.process_line(recircumflex(line.rstrip().decode("cp1251")))
        c+=1
        #~ if c==5:
            #~ break


print >>sink, """</xdxf>"""
