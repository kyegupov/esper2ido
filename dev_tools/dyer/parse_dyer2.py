# coding: utf-8

import json, glob,codecs, re
from HTMLParser import HTMLParser 
from htmlentitydefs import name2codepoint


articles = []

re_w = re.compile("[a-zA-Z]*-?[a-zA-Z]+")

S_EXPECT_WORD = 0
S_READING_WORD = 1
S_READING_DEF = 3

strong = ["b","strong"]
em = ["i","em"]




class MyParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.state = 0
        self.in_key = False
        self.key = ""
        self.baseword = ""
        self.lastroot = ""
        self.article = ""
        self.lastword = ""
        self.c = 0
        self.is_new_entry = True
        self.chain = []
        self.in_lang_sources = False
        
    def handle_starttag(self, tag, attrs):
        if tag=="p":
            self.state+=1
        if self.state == 2:
            #~ if attrs:
                #~ print "oh boy, attrs!", attrs
                #~ raise
            if tag in strong:
                self.in_key = True
            if tag in em:
                self.chain.append("ex")
                self.article += "<ex>"
                    
            if tag=="br":
                if self.in_key:
                    self.add_corrected_key()
                self.chain.reverse()
                for tn in self.chain:
                    self.article += "</"+tn+">"
                self.save_article(True)
                
            else:
                pass
                #~ self.chain.append(tag)
        
    def handle_endtag(self, tag):
        if self.state == 2:
            
            if tag in strong:
                if self.in_key:
                    self.add_corrected_key()
                    self.in_key = False
            if tag in em:
                assert self.chain.pop() == "ex"
                self.article += "</ex>"
                

    
    def handle_data(self, data):
        if self.state == 2:
            if self.in_lang_sources:
                return
            if unichr(8212) in data:
                data = data.split(unichr(8212))[0].rstrip()        
                self.in_lang_sources = True
            if self.in_key:
                self.key += data
            else:
                self.article += data
    
    def handle_charref(self, name):
        cpoint = int(name)
        if cpoint>255:
            self.handle_data(unichr(cpoint))
        else:
            self.handle_data(chr(cpoint).decode("cp1252"))

    def handle_entityref(self, name):
        self.handle_data(unichr(name2codepoint[name]))

    def handle_startendtag(self, tag, attrs):
        if self.state == 2:
            if tag=="br":
                if self.in_key:
                    self.add_corrected_key()
                self.chain.reverse()
                for tn in self.chain:
                    self.article += "</"+tn+">"
                self.save_article(True)
            #~ if attrs:
                #~ print "oh boy, attrs!", attrs
                #~ raise

    def add_corrected_key(self):
        self.key = self.key.replace(u"\n",u" ").strip().rstrip(u":")
        keys = []
        for k in self.key.split(u","):
            words = k.strip().split(" ")
            if self.baseword=="" and len(words)==1:
                self.baseword = words[0].split("-")[0]
            words2 = []
            for w in words:
                if w.startswith("-") and self.baseword!="":
                    words2.append(self.baseword+w[1:].replace("-",""))
                else:
                    words2.append(w.replace("-",""))
            keys.append(" ".join(words2))
        
        wrapped = ", ".join(["<k>"+key.strip()+"</k>" for key in keys])
        self.article += wrapped
        self.key = ""
        
          
    def save_article(self, end_of_entry):

        
        articles.append(self.article)
                
        self.key = ""
        self.article = ""
        self.baseword = ""
        self.chain = []
        self.in_lang_sources = False

        
sink = codecs.open("out.xml","wt","utf-8")
print >>sink, """<xdxf lang_from="io" lang_to="en" format="l">"""


for fn in glob.glob("i*.htm"):
    p = MyParser()
    p.feed(open(fn).read().decode('latin-1'))
    
    #~ soup = BeautifulSoup(open(fn).read())

    #~ p = soup.findAll('p')[1]

    #~ c.key = ""
    #~ c.value = ""
    #~ for child in p:
        #~ process_node(child, c, toplevel = True)
    #~ register_word(c)
    #~ print fn, len(dic)


for a in articles:
    print >>sink, "<ar>"+a.replace("&","&amp;")+"</ar>"
    
print >>sink, "</xdxf>"
