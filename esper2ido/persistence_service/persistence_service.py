import web, json

urls = (
    '/add_word', 'AddWord'
)
app = web.application(urls, globals())

class AddWord:        
    def POST(self):
        global dic
        params = web.input()
        if params.word and params.trans:
            dic[params.word] = [{"w":params.trans}]
            try:
                json.dump(dic, open("../dicts/custom_dict.json", "wt"))
                return "success"
            except:
                raise

dic = {}

if __name__ == "__main__":
    try:
        dic = json.load(open("../dicts/custom_dict.json", "rt"))
    except IOError:
        pass
    app.run()
