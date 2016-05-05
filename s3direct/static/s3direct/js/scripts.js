(function(){

    "use strict"

    var getCookie = function(name) {
        var value = '; ' + document.cookie,
            parts = value.split('; ' + name + '=')
        if (parts.length == 2) return parts.pop().split(';').shift()
    }

    var request = function(method, url, data, headers, el, showProgress,res, cb,active_div) {
        var req = new XMLHttpRequest()
        req.open(method, url, res)
        console.log('inside request')
        Object.keys(headers).forEach(function(key){
            req.setRequestHeader(key, headers[key])
        })

        req.onload = function() {
            cb(req.status, req.responseText)
        }

        req.onerror = req.onabort = function() {
            disableSubmit(false)
            error(el, 'Sorry, failed to upload file.')
        }
        if(active_div!=undefined)
        req.upload.onprogress = function(data) {
            console.log('inside onprogress event')
            progressBar(el, data, showProgress,active_div)
        }

        req.send(data)
    }

    var parseURL = function(text) {
        var xml = new DOMParser().parseFromString(text, 'text/xml'),
            tag = xml.getElementsByTagName('Location')[0],
            url = unescape(tag.childNodes[0].nodeValue)

        return url
    }

    var parseJson = function(json) {
        var data
        try {data = JSON.parse(json)}
        catch(e){ data = null }
        return data
    }

    var progressBar = function(el, data, showProgress,active_div) {
        if(data.lengthComputable === false || showProgress === false) return

        var pcnt = Math.round(data.loaded * 100 / data.total)
        active_div.width(pcnt + '%');
        active_div.text(pcnt + '%');
    }

    var error = function(el, msg) {
        el.className = 's3direct form-active'
        el.querySelector('.file-input').value = ''
        alert(msg)
    }

    var update = function(el, xml) {
        //var link = el.querySelector('.file-link'),
        //    url  = el.querySelector('.file-url')
        //
        //url.value = parseURL(xml)
        var url=parseURL(xml)
        el.setAttribute('href', url)
        el.innerHTML = url.split('/').pop()

        //el.className = 's3direct link-active'
        //el.querySelector('.bar').style.width = '0%'
    }

    var concurrentUploads = 0
    var disableSubmit = function(status) {
        var submitRow = document.querySelector('.submit-row')
        if( ! submitRow) return

        var buttons = submitRow.querySelectorAll('input[type=submit]')

        if (status === true) concurrentUploads++
        else concurrentUploads--

        ;[].forEach.call(buttons, function(el){
            el.disabled = (concurrentUploads !== 0)
        })
    }

    var upload = function(file, data, el,active_div) {
        var form = new FormData()

        disableSubmit(true)

        if (data === null) return error(el, 'Sorry, could not get upload URL.')

        el.className = 's3direct progress-active'
        var url  = data['form_action']
        delete data['form_action']

        Object.keys(data).forEach(function(key){
            form.append(key, data[key])
        })
        form.append('file', file)

        request('POST', url, form, {}, el, true, true, function(status, xml){
            disableSubmit(false)
            if(status !== 201) return error(el, 'Sorry, failed to upload to S3.')
            console.log(el);
            console.log(xml);
            update(el, xml)
        },active_div)
    }

    var getUploadURL = function(e) {
        var i;
        var bar_section=$('.progress-bar-section');
        console.log(bar_section)
        for(i=0;i< e.target.files.length;i++)
        {
            var el       = e.target.parentElement,
                file     = el.querySelector('.file-input').files[i],
                dest     = el.querySelector('.file-dest').value,
                url      = el.getAttribute('data-policy-url'),
                form     = new FormData(),
                headers  = {'X-CSRFToken': getCookie('csrftoken')}

            form.append('type', file.type)
            form.append('name', file.name)
            form.append('dest', dest)
            bar_section.append('<div data-id='+i+' >' +
            '<div class="progress progress-striped active">'+
            '                <div class="bar"></div>' +
            '            </div>'+
            '<div class="link">'+
            '                <a class="file-link" target="_blank" href=""></a>'+
            '            </div>'+
            '            </div>');
            var active_progressbar=$('[data-id='+i+']');
            var active_div=active_progressbar.find('.bar');
            el=active_progressbar.find('.file-link')[0];
            console.log(active_div);
            console.log(el);
            request('POST', url, form, headers, el, false, false, function(status, json){
                var data = parseJson(json)
                switch(status) {
                    case 200:
                        upload(file, data, el,active_div)
                        break;
                    case 400:
                    case 403:
                        error(el, data.error)
                        break;
                    default:
                        error(el, 'Sorry, could not get upload URL.')
                }
            })
        }
    }

    var removeUpload = function(e) {
        e.preventDefault()

        var el = e.target.parentElement
        el.querySelector('.file-url').value = ''
        el.querySelector('.file-input').value = ''
        el.className = 's3direct form-active'
    }

    var addHandlers = function(el) {
        var url    = el.querySelector('.file-url'),
            input  = el.querySelector('.file-input'),
            remove = el.querySelector('.file-remove'),
            status = (url.value === '') ? 'form' : 'link'

        el.className = 's3direct ' + status + '-active'

        //remove.addEventListener('click', removeUpload, false)
        input.addEventListener('change', getUploadURL, false)
    }

    document.addEventListener('DOMContentLoaded', function(e) {
        ;[].forEach.call(document.querySelectorAll('.s3direct'), addHandlers)
    })

    document.addEventListener('DOMNodeInserted', function(e){
        if(e.target.tagName) {
            var el = e.target.querySelector('.s3direct')
            if(el) addHandlers(el)
        }
    })

})()