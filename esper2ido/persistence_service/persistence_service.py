import web, json

urls = (
    '/add_word', 'AddWord',
    '/ping', 'Ping'
)
app = web.application(urls, globals())

class AddWord:        
    def POST(self):
        try:
            dic = json.load(open("../dicts/custom_dict.json", "rt"))
        except IOError:
            dic = {}
        params = web.input()
        if params.word and params.trans:
            dic[params.word] = [{"x":params.trans}]
            try:
                json.dump(dic, open("../dicts/custom_dict.json", "wt"))
                web.header('Access-Control-Allow-Origin','*', unique=True)
                web.header('Access-Control-Allow-Methods','POST, GET, OPTIONS', unique=True)
                return "success"
            except:
                raise
                
    def OPTIONS(self):
        web.header('Access-Control-Allow-Origin','*', unique=True)
        web.header('Access-Control-Allow-Methods','POST, GET, OPTIONS', unique=True)
        return ""

class Ping:        
    def POST(self):
        web.header('Access-Control-Allow-Origin','*', unique=True)
        web.header('Access-Control-Allow-Methods','POST, GET, OPTIONS', unique=True)
        return "pong"
                
    def OPTIONS(self):
        web.header('Access-Control-Allow-Origin','*', unique=True)
        web.header('Access-Control-Allow-Methods','POST, GET, OPTIONS', unique=True)
        return ""


if __name__ == "__main__":
    app.run()
