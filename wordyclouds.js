/*
Copyright (c) 2010, Toby Ho

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var CommonWords = {}
CommonWords.english = "a about after again against all an another any and are as at\
 be being been before but by\
 can could\
 did do don't down\
 each\
 few from for\
 get got great\
 had has have he her here his him himself hers how\
 i if i'm in into is it it's\
 just\
 like\
 made me more most my\
 no not\
 of off on once one only or other our out over own\
 said she should so some such\
 than that the their them then there these they this those through to too\
 under until up\
 very\
 was wasn't we were we're what when where which while who why will with would wouldn't\
 you your".split(' ')

var ColorPalates = {}
ColorPalates.autumn = 
[
    [255, 136, 64],
    [149, 141, 79],
    [115, 123, 85],
    [89, 85, 64],
    [81, 62, 56]
]

/* ============== Util Functions ========================== */

function getText(elm, excludeTags){
	if (elm.nodeType == 3) return elm.nodeValue
	if (excludeTags && elm.tagName && 
	    excludeTags.indexOf(elm.tagName.toLowerCase()) != -1) return ''
	var ret = ''
	for (var i = 0; i < elm.childNodes.length; i++){
		ret += getText(elm.childNodes[i], excludeTags)
	}
	return ret
}

function keys(obj){
    var ret = []
    for (var key in obj) ret.push(key)
    return ret
}

function tokenize(text, commonWords){
    return text
        .replace(/[^\'a-zA-Z]/g, ' ')
        .split(' ')
        .filter(function(p){return p != ''})
        .map(function(word){
            return word.toLowerCase()
        })
        .filter(function(word){
        	return commonWords.indexOf(word) == -1
        })
}

function wordSummary(text, commonWords){
    var words = tokenize(text, commonWords)
    var freq = {}
    words.forEach(function(word){ 
        freq[word] = (freq[word] || 0) + 1
    })
    return freq
}

function calculateSizeScale(freq){
    var max = 0
    keys(freq).forEach(function(word){
        if (freq[word] > max)
            max = freq[word]
    })
    return 110 / max
}

function boxesOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    var pad = 10
    if (ax + aw + pad < bx) return false
    if (bx + bw + pad < ax) return false
    if (ay + ah * 0.5 + pad < by - bh) return false
    if (by + bh * 0.5 + pad < ay - ah) return false
    return true
}

function stripHTML(oldString) {
    var data = []
    var inTag = false;
    for(var i = 0; i < oldString.length; i++) {
        var chr = oldString.charAt(i)
        if (chr == '<') inTag = true;
        if (chr == '>') inTag = false;
        if(!inTag) data.push(chr)
    }
    return data.join('');
}

/* ========== Layouts ============================ */

var Layouts = {}

Layouts.random = function RandomLayout(freq, canvas, colors){
    var padding = 100
    var context = canvas.getContext('2d')
    var sizeScale = calculateSizeScale(freq)
    keys(freq).forEach(function(word){
        var x = padding + Math.random() * (canvas.width - 3 * padding)
        var y = padding + Math.random() * (canvas.height - 2 * padding)
        var c = Math.floor(Math.random() * colors.length)
        var c = colors[c]
        context.fillStyle = 'rgba(' + c.join(',') + ', 0.6)'
        context.font = (freq[word] * sizeScale) + 'px Arial'
        context.fillText(word, x, y)
    })
}

Layouts.randomAvoid = function RandomAvoidLayout(freq, canvas, colors, fontName){
    function estimateSizeScale(freq, width, height){
        var totalRelArea = 0
        var wordCount = 0
        for (var word in freq){
            var fontSize = freq[word]
            var wordArea = (fontSize * 1.5 * (word.length * fontSize * 0.8))
            totalRelArea += wordArea
            wordCount++
        }
        var area = (width - 2 * padding) * (height - 2 * padding)
        return Math.sqrt(area / totalRelArea)
    }
    var padding = 20
    var context = canvas.getContext('2d')
    var sizeScale = estimateSizeScale(freq, canvas.width, canvas.height)
    console.log('sizeScale: ' + sizeScale)
    var words = keys(freq).sort(function(one, other){
        return freq[other] - freq[one]
    })
    //console.log('words sorted: ' + words)
    //words = words.slice(0, 200)
    words.forEach(function(word){
        var textHeight = freq[word] * sizeScale
        if (textHeight < 5) return
        //console.log('word[' + word + '].height = ' + textHeight)
        context.font = textHeight + 'px ' + fontName
        var textWidth = context.measureText(word).width
        var vertical = Math.random() > 0.5
        
        var x, y
        var triesLeft = 10000, collided = true
        while(triesLeft > 0 && collided){
            // bitmap-based collision detection
            var pad = 5
            var imgData
            if (vertical){
                
                x = padding + textHeight * 1.5 + Math.random() * (canvas.width - textHeight * 1.5 - 2 * padding)
                y = padding + textWidth + Math.random() * (canvas.height - textWidth - 2 * padding)
                imgData = context.getImageData(
                    x - textHeight * 1.5 - pad, y - textWidth - pad, 
                    textHeight * 1.5 + 2 * pad, textWidth + 2 * pad)
            }else{
                
                x = padding + Math.random() * (canvas.width - textWidth - 2 * padding)
                y = padding + textHeight + Math.random() * (canvas.height - textHeight * 1.5 - 2 * padding)
                imgData = context.getImageData(
                    x - pad, y - textHeight - pad, 
                    textWidth + 2 * pad, textHeight * 1.5 + 2 * pad)
            }
            var pxlArr = imgData.data
            var painted = false
            for (var i = 3; i < pxlArr.length; i+=4)
                if (pxlArr[i] > 0){
                    painted = true
                    break
                }
            collided = painted
            triesLeft--
        }
        if (triesLeft == 0)
            console.log('Failed to avoid overlap for [' + word + ']')
        var c = Math.floor(Math.random() * colors.length)
        var c = colors[c]
        context.fillStyle = 'rgba(' + c.join(',') + ', 1)'
        context.font = textHeight + 'px ' + fontName
        //console.log('fillText: ' + [word, x, y].join(', '))
        
        if (vertical){
            context.save()
            context.translate(x, y)
            context.rotate(-Math.PI / 2)
            context.fillText(word, 0, 0)
            context.restore()
        }else
            context.fillText(word, x, y)
        
        //console.log('box[' + word + ']: ' + box)
    })
}

/* =========== main entry point ========================= */

WordyClouds = {}
WordyClouds.loadFromText = function(text){
    var commonWords = CommonWords.english
    var freq = wordSummary(text, commonWords)
    this.loadFromWordFreq(freq)
}
WordyClouds.loadFromWordFreq = function(freq){
    var layout = Layouts.randomAvoid
    var palate = ColorPalates.autumn
    var fontName = getComputedStyle(document.body)['font-family']
    var canvas = document.createElement('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    document.body.innerHTML = ''
    document.body.appendChild(canvas)
    document.body.style.padding = '0'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
    layout(freq, canvas, palate, fontName)
}
WordyClouds.loadFromDelicious = function(username){
    JSONP.get('http://feeds.delicious.com/feeds/json/tags/' + username, function(data){
        WordyClouds.loadFromWordFreq(data)
    })
}
WordyClouds.loadFromFeed = function(url, numEntries){
   numEntries = numEntries || 10
   var rand = new Date().getTime()
   JSONP.get('http://www.google.com/uds/GlookupFeed?context=0&hl=en&q=' + encodeURI(url) + '&v=1.0&nocache=' + rand, function(v, data){
       rand = new Date().getTime()
       JSONP.get('http://www.google.com/uds/Gfeeds?context=1&num=' + numEntries + '&hl=en&output=json&q=' + encodeURI(data.url) + '&v=1.0&nocache=' + rand, function(v, data){
           var entries = data.feed.entries
           var text = ''
           entries.forEach(function(entry){
               text += entry.title + '\n'
               text += stripHTML(entry.content) + '\n'
           })
           WordyClouds.loadFromText(text)
       })
   })
}
WordyClouds.runBookmarklet = function(){
    var text = getText(document.body, ['script'])
    this.loadFromText(text)
}
