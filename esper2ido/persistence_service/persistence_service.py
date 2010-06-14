import web, json

urls = (
    '/add_word', 'AddWord'
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
            dic[params.word] = [{"w":params.trans}]
            try:
                json.dump(dic, open("../dicts/custom_dict.json", "wt"))
                return "success"
            except:
                raise
                
    def OPTIONS(self):
        web.header('Access-Control-Allow-Origin','*', unique=True)
        web.header('Access-Control-Allow-Methods','POST, GET, OPTIONS', unique=True)
        return ""



if __name__ == "__main__":
    app.run()
