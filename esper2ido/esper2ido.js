
var dict = {};
dyer = null;
bokaryov = null;

re_conso = /[bcdfghjklmnpqrstvwxyz]/i;
re_pureword = /[a-zĝĉĵŝĥŭ-]+/i;
re_transword = /{?[a-zĝĉĵŝĥŭ\\-]+[}~]?/i;

function main() {
    dict_names = ["base_dict.json", "custom_dict.json"];
    $.each(dict_names, function() {
        $.getJSON("dicts/"+this, function(data){
            for (var key in data) {
                dict[esp_normalize(key, "ĉ")] = data[key];
            }
        });
    });
    $.getJSON("dicts/bokaryov.json", function(data){
        bokaryov = data;
    });    
    $.getJSON("dicts/dyer.json", function(data){
        dyer = data;
    });

    $("#go").click(translate);
    $("#go")[0].disabled = false;
    
    // Persistence service-related stuff
    $("#add_word")[0].disabled = true;
    $("#add_word").click(add_custom_translation);
    $("#edit").click(view2edit);
    $("#view").click(edit2view);
    $("#discard_edits_cb").click(toggle_discard);
    setInterval(ping_service, 1000);
    
    stats = {translated:0,ambiguous:0,fuzzy:0,untranslated:0};
    word_status = {};
}

function mark_has_edits(flag) {
    if (flag===false) {
        $("#discard_edits").hide();
        $("#discard_edits_cb").val(true);
    } else {
        $("#discard_edits").show();
        $("#discard_edits_cb").val(false);
        $("#go")[0].disabled = true;
    }
}

function toggle_discard() {
    $("#go")[0].disabled = !$("#discard_edits_cb").val();
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
            "ojn":"o N",
            "on":"o N",
            "oj":"o N",
            "o":"o N",
            "ajn":"a ADJ",
            "an":"a ADJ",
            "aj":"a ADJ",
            "a":"a ADJ",
            "is":"as V",
            "as":"as V",
            "os":"as V",
            "u":"as V",
            "i":"as V",
            "e":"e ADV"
        };
        for (var end in ends) {
            var index = word.length-end.length;
            if (index>1 && word.substr(index)===end) {
                wordObj.base = word.substr(0, index);
                wordObj.form = end;
                var ce_pos = ends[end].split(" ");
                
                wordObj.canonicalEnding = ce_pos[0];
                wordObj.posCode = ce_pos[1];
                return 
            }
        }
    }
    wordObj.base = word;
    wordObj.form = "";
    wordObj.posCode = "?";
    wordObj.canonicalEnding = "";
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
    
    var base = esp_normalize(wordObj.base, "ĉ");
    var pureWord = esp_normalize(wordObj.pureWord, "ĉ");

    var fallbacks = fallback_table[wordObj.canonicalEnding];
    fallbacks.unshift(null);
    for (var i=0; i<fallbacks.length; i++) {
        var end = fallbacks[i];
        var res = end===null ? dict[pureWord.toLowerCase()] : dict[base+end];
        if (res===undefined) continue;
        if (typeof(res[0])==="undefined") res = [res];
        if (i>1) res = $.each(res,function(x){return x.fuz=true});
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

function is_consonant(c) {
    return re_conso.exec(c)!==null;
}

function hescape(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function get_pureword(s) {
    var match = re_pureword.exec(s.toLowerCase());
    if (match===null) return null;
    return match[0];
}

function canonicalize_ido(word) {
    var forms = {
        "in":"i o",
        "on":"o",
        "i":"i o",
        "o":"o",
        "a":"a o",
        "ar":"ar as",
        "is":"ar as",
        "as":"ar as",
        "os":"ar as",
        "ez":"ar as",
        "e":"e a"
    };
    for (var end in forms) {
        var index = word.length-end.length;
        if (index>1 && word.substr(index)===end) {
            var inflex = function(e) {return word.substr(0, index)+e};
            return $.map(forms[end].split(" "), inflex);
            
        }
    }
    return [word];
}

function canonicalize_esperanto(word) {
     var forms = {
            "ojn":"oj o",
            "on":"o",
            "oj":"oj o",
            "o":"o",
            "ajn":"aj a",
            "an":"a o",
            "aj":"aj a o",
            "a":"a o",
            "is":"i as",
            "as":"i as",
            "os":"i as",
            "u":"i as",
            "i":"i as",
            "e":"e a"
    };
    for (var end in forms) {
        var index = word.length-end.length;
        if (index>1 && word.substr(index)===end) {
            var inflex = function(e) {return word.substr(0, index)+e};
            return $.map(forms[end].split(" "), inflex);
            
        }
    }
    return [word];
}

function parse_word(word) {
        var match = re_pureword.exec(word);
        if (match===null) {
            return {verbatim: word};
        }
        var pureword = match[0];
        
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
    write_decorated_source(text.split(" "));
    //~ $("#target_e").text(text);
    mark_has_edits(false);
}

function xdxf2html(s) {
    return s.replace(/<k>/g, "<b>").replace(/<\/k>/g, "</b>").replace(/<ex>/g, "<i>").replace(/<\/ex>/g, "</i>");
}

function add_hover_translation(dict, el, raw, canonicalizer) {
    if (dict===null) return;
    var words = canonicalizer(raw);
    if (words[0]!=raw) {
        words.unshift(raw);
    }
    for (var i=0; i<words.length; i++) {
        var item = words[i];
        var article_ids = dict.index[item];
        if (typeof(article_ids)!=="undefined") {
            console.log(item+" "+article_ids);
            var texts = [];
            $.each(article_ids, function() { texts.push(xdxf2html(dict.articles[this])) });
            console.log(texts);
            el.tooltip({ 
                bodyHandler: function() { 
                    return texts.join("<br>"); 
                } 
            });
            return;
        }
    }
}

function write_decorated_output(textOutput) {
    var target2 = $("#target");
    target2.empty();
    
    var target = [];
    
    stats = {translated:0,ambiguous:0,fuzzy:0,untranslated:0};
    word_status = {};
    
    for (var i=0; i<textOutput.length; i++) {
        var wordObj = parse_translated_word(textOutput[i]);
        // Append backslash-separated translations to output text
        if (i>0) target.push(" ");
        if (wordObj.hasOwnProperty("pureTrans")) {
            target.push($("<span/>").text(wordObj.left));
            var translations = wordObj.pureTrans.split("\\");
            var el = $("<span/>");
            if (translations.length>1) {
                el.attr("id", "iw"+i);
                word_status[i] = null;
                $.each(translations, function(j, item){
                    if (j>0) el.append("\\");
                    var el2 = $("<span/>");
                    el2.addClass("ambiguous");
                    el2.click(highlight_choice);
                    var id = "iw"+i+"_"+j;
                    el2.attr("id", id);
                    el2.text(item);
                    add_hover_translation(dyer, el2, get_pureword(item), canonicalize_ido)
                    el.append(el2);
                });
                stats.ambiguous++;
            } else {
                var item = translations[0];
                el.text(item);
                add_hover_translation(dyer, el, get_pureword(item), canonicalize_ido)
                if (item.charAt(0)=="{") {
                    el.addClass("untranslated");
                    stats.untranslated++;
                    el.click(add_translation_on_click);
                } else if (item.charAt(item.length-1)=="~"){
                    el.addClass("fuzzy");
                    stats.fuzzy++;
                } else {
                    stats.translated++;
                }
            }
            target.push(el);
            target.push($("<span/>").text(wordObj.right));
        } else {
            target.push($("<span/>").text(wordObj.verbatim));
        }
    };
    $(target).appendTo(target2);
    refresh_stats();
}    

function write_decorated_source(textOutput) {
    var target2 = $("#target_e");
    target2.empty();
    
    var target = [];
    
    for (var i=0; i<textOutput.length; i++) {
        var wordObj = parse_word(textOutput[i]);
        // Append backslash-separated translations to output text
        if (i>0) target.push(" ");
        if (wordObj.hasOwnProperty("pureWord")) {
            target.push($("<span/>").text(wordObj.left));
            var el = $("<span/>");
            var item = wordObj.pureWord;
            el.text(item);
            add_hover_translation(bokaryov, el, get_pureword(item), canonicalize_esperanto)
            target.push(el);
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
    var old_status = word_status[i];
    if (old_status===null) {
        stats.ambiguous--;
    } else {
        stats[old_status]--;
    }
    
    for (var j=0; true; j++) {
        var el = $("#iw"+i+"_"+j);
        if (el.length===0) break;
        if (j===jj) {
            el[0].className = "selected";
        } else {
            el[0].className = "unselected";
        }
    }
    var txt = $("#iw"+i+"_"+jj).text();
    if (txt.charAt(txt.length-1)==="~") {
        word_status[i] = "fuzzy";
        stats.fuzzy++;
    } else {
        word_status[i] = "translated";
        stats.translated++;
    }
    refresh_stats();
    mark_has_edits(true);
}

function add_translation_on_click() {
    var txt = $(this).text();
    txt = txt.substring(1,txt.length-1);
    var wordObj = {pureWord:txt};
    deconstruct_esperanto(wordObj);
    $("#word").val(wordObj.base+wordObj.canonicalEnding);
    $("#trans").val("");
    $("#posCode").val(wordObj.posCode);
    $("#trans").focus();
}

function view2edit() {
    var txtNodes = $("#target")[0].childNodes;
    var txt = "";
    $.each(txtNodes, function(j, item){
        if (item.id) {
            // Ambiguous translation
            var i = parseInt(item.id.substr(2));
            var status = word_status[i];
            if (status) {
                $.each(item.childNodes, function(k, item2){
                    if (item2.className==="selected") {
                        txt+=item2.textContent;
                        
                        return;
                    }
                });
                return;
            } 
        }
        txt+=item.textContent;
    });
    $("#target2").val(txt);
    $("#target").hide();
    $("#target2").show();
    $("#edit").hide();
    $("#view").show();
    $("#stats").text("");
    mark_has_edits(true);
}


function edit2view() {
    var txt = $("#target2").val();
    write_decorated_output(txt.split(" "));
    $("#target").show();
    $("#target2").hide();
    $("#edit").show();
    $("#view").hide();
}

function refresh_stats() {
    var txt = "";
    for (var name in stats) {
        txt+= name+": "+stats[name]+" ";
    }
    $("#stats").text(txt);
}


function add_custom_translation() {
    var params = {word:$("#word").val(), trans:$("#trans").val(), posCode:$("#posCode").val()};
    $("#result").text("saving...");
    var onSuccess = function(response, status){
        if (response==="success") {
            $("#result").text("saved succesfully");
            var ew = esp_normalize(params.word, "ĉ");
            if (!dict.hasOwnProperty(ew)) dict[ew]=[];
            dict[ew].push({x:params.trans, posCode:params.posCode});
        } else {
            $("#result").css("color","red").text("SOME ERROR");
        }
    };
    $.post("http://127.0.0.1:8080/add_word", params, onSuccess, "text");
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

