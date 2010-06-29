
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
    
    $("#go")[0].disabled = true;
    $.getJSON("dicts/dyer.json", function(data){
        dyer = data;
        $("#go")[0].disabled = false;
    });
    $("#go").click(translate);
    
    // Persistence service-related stuff
    $("#add_word")[0].disabled = true;
    $("#add_word").click(add_custom_translation);
    $("#edit").click(view2edit);
    $("#view").click(edit2view);
    //~ setInterval(ping_service, 1000);
    
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


function deconstruct_esperanto(wordObj) {
    if (!wordObj.hasOwnProperty("pureWord")) return;
    var word = wordObj.pureWord.toLowerCase();
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
                wordObj.base = word.substr(0, index);
                wordObj.form = end;
                wordObj.posCode = ends[end];
                return 
            }
        }
    }
    wordObj.base = word;
    wordObj.form = "";
    wordObj.posCode = "";
    return;
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

function translate_using_dictionary(wordObj) {
    
    // If we do not find translation using the exact part of speech - try alternative POS
    var fallback_table = {
        "o":["o"],
        "a":["a","o"],
        "e":["e","a","o"],
        "as":["as"],
        "":[""]
    }
    
    var fallbacks = fallback_table[wordObj.posCode];
    for (var i=0; i<fallbacks.length; i++) {
        var end = fallbacks[i];
        var res = dict[wordObj.base+end];
        if (res===undefined) continue;
        if (typeof(res[0])==="undefined") res = [res];
        if (i>0) res = $.each(res,function(x){return x.fuz=true});
        return res;
    }
    return null;
}

function translate_word(wordObj, words, i) {
    var translations = translate_using_dictionary(wordObj);
    if (wordObj.base=="kaj" || wordObj.base=="au") {
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
        
        if (!word.hasOwnProperty("pureWord")) {
            continue;
        }
        return word.pureWord;
    }
}

re_conso = /[bcdfghjklmnpqrstvwxyz]/i;
re_pureword = /[a-zĝĉĵŝĥŭ]+/i;
re_pureido = /[a-z]+/i;
re_transword = /{?[a-z\\]+[}~]?/i;



function is_consonant(c) {
    return re_conso.exec(c)!==null;
}

function hescape(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function canonicalize_for_dyer(s) {
    var match = re_pureido.exec(s.toLowerCase());
    if (match===null) return s;
    var word = match[0];
    if (word.length>2) {
        var ends = {
            "in":"o",
            "on":"o",
            "i":"o",
            "o":"o",
            "a":"a",
            "ar":"ar",
            "is":"ar",
            "as":"ar",
            "os":"ar",
            "ez":"ar",
            "e":"e"
        };
        for (var end in ends) {
            var index = word.length-end.length;
            if (index>1 && word.substr(index)===end) {
                return word.substr(0, index)+ends[end];
            }
        }
    }
    return s;
}

function parse_word(word) {
        var match = re_pureword.exec(word);
        if (match===null) {
            return {verbatim: word};
        }
        var pureword = match[0];
        pureword = esp_normalize(pureword, "ĉ");
        
        wordObj = {};
        wordObj.verbatim = word;
        wordObj.pureWord = pureword;
        wordObj.caseCode = get_case(pureword);
        wordObj.left = word.substr(0, match.index);
        wordObj.right = word.substr(match.index+pureword.length);
        
        
        return wordObj;
}

function parse_translated_word(word) {
        var match = re_transword.exec(word);
        if (match===null) {
            return {verbatim: word};
        }
        var pureword = match[0]
        
        wordObj = {};
        wordObj.verbatim = word;
        wordObj.pureTrans = pureword;
        wordObj.left = word.substr(0, match.index);
        wordObj.right = word.substr(match.index+pureword.length);
        
        
        return wordObj;
}



function translate() {
    var text = $("#source").val().replace(/[\\~{}]/g, "");
    var out = [];   
    
    var words = text.split(" ");
    
    // Deconstruct Esperanto words
    var parsed_words = $.map(words, parse_word);
    $.map(parsed_words, deconstruct_esperanto);
    
    var textOutput = [];
    
    for (var i=0;i<parsed_words.length; i++) {
        var wordObj = parsed_words[i];
        
        var translations = null;
        
        if (wordObj.hasOwnProperty("base")) {
            // Generate list of possible translations
            translations = translate_word(wordObj, parsed_words, i);    
            // Convert Esperanto grammar form (ending) to Ido grammar form
            var ido_form = translate_form_eo2io(wordObj.form); // TODO: remove accusative in SVO constructs
            if (typeof(ido_form)!=="undefined" && translations!=null) {
                wordObj.translations = translations;
            }
        }
        
        if (wordObj.hasOwnProperty("pureWord")) {
            if (wordObj.hasOwnProperty("translations")) {
                var tword = wordObj.left;
                $.each(wordObj.translations, function(j){
                    if (j>0) tword += "\\";
                    var r = reconstruct_ido_word(this, ido_form, wordObj.caseCode);
                    tword += r;
                });
                tword += wordObj.right;
                textOutput.push(tword);
            } else {
                textOutput.push(wordObj.left+"{"+wordObj.pureWord+"}"+wordObj.right);
            }
        } else {
            textOutput.push(wordObj.verbatim);
        }        
    }
    
    write_decorated_output(textOutput);
    
}

function write_decorated_output(textOutput) {
    var target2 = $("#target");
    target2.empty();
    
    var target = [];
    
    for (var i=0; i<textOutput.length; i++) {
        var wordObj = parse_translated_word(textOutput[i]);
        // Append backslash-separated translations to output text
        if (i>0) target.push(" ");
        if (wordObj.hasOwnProperty("pureTrans")) {
            target.push($("<span/>").text(wordObj.left));
            var translations = wordObj.pureTrans.split("\\");
            $.each(translations, function(j, item){
                if (j>0) target.push("\\");
                var el = $("<span/>").text(item);
                var id = "iw"+i;

                if (translations.length>1) {
                    id += "_"+j;
                    el.css("color","#a0a0a0");
                    el.click(highlight_choice);
                } else if (item.charAt(0)=="{") {
                    el.css("color","#800000");
                }
                el.attr("id", id);
                var eng = dyer[canonicalize_for_dyer(item)];
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
                target.push(el);
            });
            target.push($("<span/>").text(wordObj.right));
        } else {
            target.push($("<span/>").text(wordObj.verbatim));
        }
    };
    $(target).appendTo(target2);
}    

function highlight_choice() {
    var id = $(this).attr("id");
    var parts = id.substr(2).split("_");
    var i = parseInt(parts[0]);
    var jj = parseInt(parts[1]);
    for (var j=0; true; j++) {
        var el = $("#iw"+i+"_"+j);
        if (el.length===0) break;
        var col = (j==jj) ? "#000000" : "#a0a0a0";
        el.css("color", col);
    }
}

function view2edit() {
    var txt = $("#target")[0].textContent;
    $("#target2").val(txt);
    $("#target").hide();
    $("#target2").show();
    $("#edit").hide();
    $("#view").show();
}


function edit2view() {
    var txt = $("#target2").val();
    write_decorated_output(txt.split(" "));
    $("#target").show();
    $("#target2").hide();
    $("#edit").show();
    $("#view").hide();
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
    //~ $("#service_status").css("color","black").text("Checking...");
    $.post("http://127.0.0.1:8080/ping", {}, onSuccess, "text");
}


$(document).ready(main);

