import web, json

urls = (
    '/add_word', 'AddWord',
    '/ping', 'Ping',
    '/get_word_trans', 'GetWordTrans',
)
app = web.application(urls, globals())

def common_headers():
    web.header('Access-Control-Allow-Origin','*', unique=True)
    web.header('Access-Control-Allow-Methods','POST, GET, OPTIONS', unique=True)


word_dicts = {}
word_dicts["eo"] = json.load(open("../dicts/bokaryov.json", "rt"))
word_dicts["io"] = json.load(open("../dicts/dyer.json", "rt"))

class AddWord:        
    def POST(self):
        try:
            dic = json.load(open("../dicts/custom_dict.json", "rt"))
        except IOError:
            dic = {}
        params = web.input()
        if params.word and params.trans:
            dic[params.word] = [{"x":params.trans,"pos":params.posCode}]
            try:
                common_headers()
                json.dump(dic, open("../dicts/custom_dict.json", "wt"))
                return "success"
            except:
                raise
                
    def OPTIONS(self):
        common_headers()
        return ""

class GetWordTrans:        
    def GET(self):
        params = web.input()
        common_headers()
        word_versions = params.word.splitlines()
        try:
            word_dict = word_dicts[params.lang]
        except KeyError:
            return ""
        for word in word_versions:
            try:
                article_ids = word_dict["index"][word.lower()] # TODO: prioritize master article
                print article_ids
                res = [word_dict["articles"][ai] for ai in article_ids]
                return "<hr>".join(res);
            except KeyError:
                pass
        return ""
            
    def OPTIONS(self):
        common_headers()
        return ""                

class Ping:        
    def GET(self):
        common_headers()
        return "pong"
                
    def OPTIONS(self):
        common_headers()
        return ""


if __name__ == "__main__":
    app.run()
