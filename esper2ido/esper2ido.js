
var dict;

function main() {
    $.getJSON("dicts/base_dict.json", function(data){
        dict = data;
        for (var key in data) {
            dict[esp_normalize(key, "ĉ")] = data[key];
        }
    });
	$.getJSON("dicts/dyer.json", function(data){
        dyer = data;
    });
    $("#go").click(translate);
    
}

esp_normalize_tables = {
"ĉ": {
    "ĝ":"gh",
    "ĉ":"ch",
    "ĵ":"jh",
    "ŝ":"sh",
    "ĥ":"hh",    
    "ŭ":"u"
}
}

function esp_normalize(text0, style) {
    var trtab = esp_normalize_tables[style];
    var wcase = get_case(text0);
    var text = text0.toLowerCase();
    for (var digraph in trtab) {
        text = text.replace(new RegExp(digraph, "g"), trtab[digraph]);
		text = text.replace(new RegExp(digraph, "gi"), trtab[digraph].toUpperCase());
    }
    return set_case(text, wcase);
}


function deconstruct_esp(word) {
    if (word.length>2) {
        var ends = {
            "ojn":"o",
            "on":"o",
            "oj":"o",
            "o":"o",
            "ajn":"a",
            "an":"a",
            "aj":"a",
            "a":"a",
            "is":"as",
            "as":"as",
            "os":"as",
            "u":"as",
            "i":"as",
            "e":"e"
        };
        for (var end in ends) {
            var index = word.length-end.length;
            if (index>1 && word.substr(index)===end) {
                return {base:word.substr(0, index), end:end, canonical:ends[end]};
            }
        }
    }
    return {base:word, end:"", canonical:""};
}

function get_case(s) {
    if (s==s.toUpperCase()) return "u";
    if (s.charAt(0)==s.charAt(0).toUpperCase()) return "c";
    return "l";
}

function set_case(word0, wordcase) {
	var word = word0;
    if (wordcase=="u") word = word.toUpperCase();
    if (wordcase=="c") word = word.charAt(0).toUpperCase()+word.substr(1);
    return word;
}

function reconstruct(trans, newend, wordcase) {
    var word = trans.w;
    var fuzzy = trans.fuz;
    if (word.length>2) {
        var ends = ["o","i","a","e","as"];
        for (var i=0; i<ends.length; i++) {
            var end = ends[i];
            var index = word.length-end.length;
            if (index>1 && word.substr(index)===end) {
                word = word.substr(0, index)+newend;
                break;
            }
        }
    }
    word = set_case(word, wordcase);
    if (fuzzy) word += "~";
    return word;
}

function ending_e2i(ending) {
    var ends = {
        "":"",
        "ojn":"in",
        "on":"on",
        "oj":"i",
        "o":"o",
        "ajn":"a",
        "an":"a",
        "aj":"a",
        "a":"a",
        "is":"is",
        "as":"as",
        "os":"os",
        "u":"ez",
        "i":"ar",
        "e":"e"
    };
    return ends[ending];
}

function translate_word(deco) {
    var fallback_table = {
        "o":["o"],
        "a":["a","o"],
        "e":["e","a","o"],
        "as":["as"],
        "":[""]
    }
    
    var fallbacks = fallback_table[deco.canonical];
    for (var i=0; i<fallbacks.length; i++) {
        var end = fallbacks[i];
        var res = dict[deco.base+end];
        if (res===undefined) continue;
        if (typeof(res[0])==="undefined") res = [res];
        if (i>0) res = $.each(res,function(x){return x.fuz=true});
        return res;
    }
    return undefined;
}

function get_next_pure_word(words, startIndex) {
    for (var i=startIndex;i<words.length; i++) {
		var word = words[i];
		
        var match = re_pureword.exec(word);
        if (match===null) {
            continue;
        }
        return match[0];
	}
}

re_conso = /[bcdfghjklmnpqrstvwxyz]/i;
re_pureword = /[a-zĝĉĵŝĥŭ]+/i;



function is_consonant(c) {
    return re_conso.exec(c)!==null;
}

function hescape(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


function translate() {
    var text = $("#source").val();
    var target = $("#target2");
    var out = [];   
    
    var words = text.split(" ");
    
    
    for (var i=0;i<words.length; i++) {
		if (i>0) target.append(" ");
		var word = words[i];
		
        var match = re_pureword.exec(word);
        if (match===null) {
            target.append($("<span/>").text(word));
            continue;
        }
        var pureword = match[0]
        var deco_left = word.substr(0, match.index);
        var deco_right = word.substr(match.index+pureword.length);
        pureword = esp_normalize(pureword, "ĉ");
        
        var wordcase = get_case(pureword);
        var deco = deconstruct_esp(pureword.toLowerCase());
        var translations = translate_word(deco);
        
        if (deco.base=="kaj" || deco.base=="au") {
			var pw = get_next_pure_word(words, i+1);
			if (is_consonant(pw.charAt(0))) {
				translations = $.grep(translations, function(x){return x.w.length==1});
			} else {
				translations = $.grep(translations, function(x){return x.w.length==2});
			}
		}
        
        var end2 = ending_e2i(deco.end); // TODO: remove accusative in SVO constructs
        if (typeof(translations)!=="undefined" && typeof(end2)!=="undefined") {
            var a = $.map(translations, function(t){return });
            target.append($("<span/>").text(deco_left));
            $.each(translations, function(i){
				if (i>0) target.append("\\");
				var r = reconstruct(this, end2, wordcase);
				var el = $("<b/>").text(r);
				var eng = dyer[this.w];
				if (typeof(eng)!=="undefined") {
					el.tooltip({ 
						bodyHandler: function() { 
							return eng; 
						} 
					});
				}
				target.append(el);
			});
            target.append($("<span/>").text(deco_right));
        } else {
            target.append($("<span/>").text(word));
        }
    };
    
}

$(document).ready(main);

