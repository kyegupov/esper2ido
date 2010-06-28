
var dict = {};

function main() {
    dict_names = ["base_dict.json", "custom_dict.json"];
    $.each(dict_names, function() {
        $.getJSON("dicts/"+this, function(data){
            for (var key in data) {
                dict[esp_normalize(key, "ĉ")] = data[key];
            }
        });
    });
    $.getJSON("dicts/dyer.json", function(data){
        dyer = data;
    });
    $("#go").click(translate);
    
    // Persistence service-related stuff
    $("#add_word")[0].disabled = true;
    $("#add_word").click(add_custom_translation);
    setInterval(ping_service, 1000);
    
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
                return {base:word.substr(0, index), form:end, posCode:ends[end]};
            }
        }
    }
    return {base:word, form:"", posCode:""};
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

function reconstruct_ido_word(translation, new_form, wordcase) {
    var word = translation.x;
    var fuzzy = translation.fuz;
    if (word.length>2) {
        var ends = ["o","i","a","e","as"];
        for (var i=0; i<ends.length; i++) {
            var end = ends[i];
            var index = word.length-end.length;
            if (index>1 && word.substr(index)===end) {
                word = word.substr(0, index)+new_form;
                break;
            }
        }
    }
    word = set_case(word, wordcase);
    if (fuzzy) word += "~";
    return word;
}

function translate_form_eo2io(ending) {
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

function translate_using_dictionary(deco) {
    
    // If we do not find translation using the exact part of speech - try alternative POS
    var fallback_table = {
        "o":["o"],
        "a":["a","o"],
        "e":["e","a","o"],
        "as":["as"],
        "":[""]
    }
    
    var fallbacks = fallback_table[deco.posCode];
    for (var i=0; i<fallbacks.length; i++) {
        var end = fallbacks[i];
        var res = dict[deco.base+end];
        if (res===undefined) continue;
        if (typeof(res[0])==="undefined") res = [res];
        if (i>0) res = $.each(res,function(x){return x.fuz=true});
        return res;
    }
    return null;
}

function translate_word(deco, words, i) {
    var translations = translate_using_dictionary(deco);
    if (deco.base=="kaj" || deco.base=="au") {
        var pw = get_next_pure_word(words, i+1);
        if (is_consonant(pw.charAt(0))) {
            translations = $.grep(translations, function(x){return x.x.length==1});
        } else {
            translations = $.grep(translations, function(x){return x.x.length==2});
        }
    }
    return translations;
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

function canonicalize_for_dyer(s) {
    if (s.substr(s.length-2)=="as") {
        return s.substr(0, s.length-2)+"ar"
    } else {
        return s
    }
}

function parse_esperanto_word(word) {
        var match = re_pureword.exec(word);
        if (match===null) {
            return {verbatim: word};
        }
        var pureword = match[0]
        pureword = esp_normalize(pureword, "ĉ");
        
        var deco = deconstruct_esp(pureword.toLowerCase());
        deco.verbatim = word;
        deco.pureWord = pureword;
        deco.caseCode = get_case(pureword);
        deco.left = word.substr(0, match.index);
        deco.right = word.substr(match.index+pureword.length);
        
        return deco;
}


function translate() {
    var text = $("#source").val();
    var target = $("#target2");
    target.empty();
    var out = [];   
    
    var words = text.split(" ");
    
    
    for (var i=0;i<words.length; i++) {
        if (i>0) target.append(" ");
        
        // Deconstruct Esperanto word
        var deco = parse_esperanto_word(words[i]);
        
        var translations = null;
        
        if (deco.hasOwnProperty("base")) {
            // Generate list of possible translations
            translations = translate_word(deco, words, i);    
            // Convert Esperanto grammar form (ending) to Ido grammar form
            var ido_form = translate_form_eo2io(deco.form); // TODO: remove accusative in SVO constructs
            if (typeof(ido_form)==="undefined") {
                translations = null;
            }
        }
        
        // Append backslash-separated translations to output text
        if (translations!==null) {
            target.append($("<span/>").text(deco.left));
            $.each(translations, function(i){
                if (i>0) target.append("\\");
                var r = reconstruct_ido_word(this, ido_form, deco.caseCode);
                var el = $("<b/>").text(r);
                if (translations.length>1) {
                    el.css("color","#a0a0a0");                    
                }
                var eng = dyer[canonicalize_for_dyer(this.x)];
                if (typeof(eng)!=="undefined") {
                    if (eng.alias) eng = dyer[eng.alias];
                    if (typeof(eng)!=="undefined" && eng.x) {
                        el.tooltip({ 
                            bodyHandler: function() { 
                                return eng.x; 
                            } 
                        });
                    }
                }
                target.append(el);
            });
            target.append($("<span/>").text(deco.right));
        } else {
            target.append($("<span/>").text(deco.verbatim));
        }
    };
}

function add_custom_translation() {
    var data = {word:$("#word").val(), trans:$("#trans").val()};
    $("#result").text("saving...");
    var onSuccess = function(data, status){
        if (data==="success") {
            $("#result").text("saved succesfully");
        } else {
            $("#result").css("color","red").text("SOME ERROR");
        }
    };
    $.post("http://127.0.0.1:8080/add_word", data, onSuccess, "text");
}

function ping_service() {
    var onSuccess = function(data, status){
        if (data==="pong") {
            $("#service_status").css("color","green").text("Available");
            $("#add_word")[0].disabled = false;
        } else {
            $("#service_status").css("color","red").text("Not available");
            $("#add_word")[0].disabled = true;
        }
    };
    $("#service_status").css("color","black").text("Checking...");
    $.post("http://127.0.0.1:8080/ping", {}, onSuccess, "text");
}


$(document).ready(main);

