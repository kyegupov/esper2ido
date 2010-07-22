# coding: utf-8

import json, glob,codecs, re
import xml.etree.ElementTree as ElementTree
    
#~ source = open("out.xml","rt")
source = open("../dyer/out.xml","rt")

root = ElementTree.parse(source)

articles = []
index = {}

c=0
for ar in root.findall("ar"):
    xml = ElementTree.tostring(ar, encoding="utf-8").decode("utf-8").strip()
    if xml.startswith(u"<ar>") and xml.endswith(u"</ar>"):
        xml = xml[4:-5]
    articles.append(xml)
    c+=1
    for k in ar.findall("k"):
        key = k.text
        nu = ""
        for subk in k.getchildren():
            if subk.tag!="nu":
                key+=subk.text
            else:
                nu+=subk.text
            key+=subk.tail
        idx = len(articles)-1
        #~ key = key.decode("utf-8")
        if key in index:
            index[key].append(idx)
        else:
            index[key] = [idx]

        
dictionary = {"articles": articles, "index":index}

#~ json.dump(dictionary, codecs.open("../../esper2ido/dicts/bokaryov.json", "wt", "utf-8"), indent=None, sort_keys=True, ensure_ascii=False)
json.dump(dictionary, codecs.open("../../esper2ido/dicts/dyer.json", "wt", "utf-8"), indent=None, sort_keys=True, ensure_ascii=False)
