# coding: utf-8

import json, glob,codecs, re
from HTMLParser import HTMLParser 
from htmlentitydefs import name2codepoint


articles = []
index = {}

re_w = re.compile("[a-zA-Z]*-?[a-zA-Z]+")

S_EXPECT_WORD = 0
S_READING_WORD = 1
S_READING_DEF = 3

strong = ["b","strong"]


def register(key, idx):
    if key in index:
        index[key].append(idx)
    else:
        index[key] = [idx]


class MyParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self.chain = []
        self.state = 0
        self.substate = S_EXPECT_WORD
        self.word = ""
        self.lastroot = ""
        self.definition = ""
        self.lastword = ""
        self.c = 0
        self.is_new_entry = True
        
    def handle_starttag(self, tag, attrs):
        if tag=="p":
            self.state+=1
        if self.state == 2:
            if attrs:
                print "oh boy, attrs!", attrs
                raise
            if tag in strong:
                if self.substate == S_EXPECT_WORD:
                    self.substate = S_READING_WORD
                elif self.substate == S_READING_DEF:
                    if self.definition.rstrip().endswith(u";"):
                        self.save_word(False)
                        self.substate = S_READING_WORD
                    
            if tag=="br":
                self.save_word(True)
                self.substate = S_READING_WORD
            else:
                self.chain.append(tag)
        
    def handle_endtag(self, tag):
        if self.state == 2:
            
            if tag in strong:
                if self.substate == S_READING_WORD:
                    self.substate = S_READING_DEF
            
            if len(self.chain)==0:
                self.state = 3
                return
            last = self.chain.pop()
            while last!=tag:
                print "unclosed: "+last
                if len(self.chain)==0:
                    self.state = 3
                    return
                last = self.chain.pop()
    
    def handle_data(self, data):
        if self.state == 2:
            if self.substate == S_READING_WORD:
                self.word += data
                self.definition += data
            if self.substate == S_READING_DEF:
                self.definition += data
    
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
            pass
            #~ if attrs:
                #~ print "oh boy, attrs!", attrs
                #~ raise
          
    def save_word(self, end_of_entry):
        if self.word=="" and self.definition=="":
            return
        self.word = self.word.replace(u"\n",u" ").strip().rstrip(u":")
        oldword = self.word
        self.aliases = self.word.split(u",")
        self.word = self.aliases[0]
        #~ print "saving: /%s/ %s" % (self.word.encode("latin1", 'replace'), preserve_root)
        kwords = re_w.findall(self.word)
        if len(kwords)==1:
            self.word = kwords[0]
            self.lastword = self.word
            self.definition = self.definition.replace(u"\n",u" ").strip()
            self.definition = self.definition.split(unichr(8212))[0].rstrip().rstrip(u";")
            self.c+=1
            
            parts = self.word.split(u"-")
            if parts[0]=="":
                if not self.is_new_entry and self.lastroot!="":
                    parts[0] = self.lastroot
                else:
                    parts = []
            else:
                if not self.is_new_entry:
                    parts = []
                else:
                    self.lastroot = parts[0]
            self.word = u"".join(parts)
            
            if self.word!="":
                articles.append(self.definition)
                register(self.word, len(articles)-1)
                for a in self.aliases[1:]:
                    a = a.strip()
                    if a=="":
                        continue
                    if not a.startswith(u"-"):
                        print "A? /%s/%s/" % (a.encode("latin1", 'replace'), oldword.encode("latin1", 'replace'))
                        continue
                    aparts = a.split(u"-")
                    aparts[0] = parts[0]
                    alias = "".join(parts)
                    kwords = re_w.findall(alias)
                    if len(kwords)==1:
                        register(alias, len(articles)-1)
                    else:
                        print "A? /%s/%s/" % (self.word.encode("latin1", 'replace'), self.lastword.encode("latin1", 'replace'))
        else:
            print "K? /%s/%s/" % (self.word.encode("latin1", 'replace'), self.lastword.encode("latin1", 'replace'))
                
        if end_of_entry:
            self.lastroot = ""
        self.word = ""
        self.definition = ""
        self.is_new_entry = end_of_entry

        


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

        
dictionary = {"articles": articles, "index":index}

json.dump(dictionary, codecs.open("../../esper2ido/dicts/dyer.json", "wt", "utf-8"), indent=None, sort_keys=True, ensure_ascii=False)    
