$(function () {
    handleRequest();
});

function queryObj(form, name) {
    let obj = $('#'+name);
    if(form) {
        let div = document.createElement("div");
        let formName = name + '-' + form.id;
        div.setAttribute('id', formName);
        obj.get(0).parentElement.append(div);
        return $('#'+formName);
    }else{
        return obj;
    }
}

function handleRequest(input) {
    let form = input ? input.parentElement : null;
    let status = queryObj(form,'status');
    const params = new URLSearchParams(location.search);
    const addr = params.get('addr');
    const routes = params.get('route') || params.get('routes');
    const command = params.get('command');
    const arg = params.get('arg') || '';
    const display = params.get('display')
    const raw = display === 'raw' || display === 'raw0';
    const raw0 = display === 'raw0';
    const juiIndexEl = document.getElementById('jui-index');
    const juiIndex = juiIndexEl ? '0' : juiIndexEl.dataset.index;
    const method = params.get('method') || 'get';

    if (!addr && !routes) {
        status.text('Provide address or route!')
        return
    }

    if (!command) {
        status.text('Provide command!')
        return
    }

    const endpoint = addr || `https://${location.hostname}/jolokia/jui-${juiIndex}`;
    const j4p = new Jolokia(endpoint);

    let out = queryObj(form,'output');
    if (form) {
        form.remove();
    }

    if (raw0)
        out.addClass("raw0");

    const errorHandler = function (res) {
        status.text('ERROR');
        out.append(document.createTextNode(res.stacktrace ? res.stacktrace : JSON.stringify(res)));
    }

    const mbean ="com.forkshunter:type=RemoteCommandProcessor";
    const operation = routes ? "requestExecuteMulti" : "requestExecute";
    const operationArgs = routes ? [routes, command, arg] : [command, arg];
    if(method === 'post') {
        j4p.request({
            type: "exec",
            mbean: mbean,
            operation: operation,
            arguments: operationArgs,
            method: "POST",
            success: function (id) {
                pollExecutionResultViaJolokia(id, j4p, raw, status, out, errorHandler);
            },
            error: errorHandler,
            ajaxError: errorHandler
        });
    }else{
        const args = [];
        args.push(mbean)
        args.push(operation);
        args.push(operationArgs)
        args.push({
            success: function (id) {
                pollExecutionResultViaJolokia(id, j4p, raw, status, out, errorHandler);
            },
            error: errorHandler,
            ajaxError: errorHandler
        });
        j4p.execute(...args);
    }
}

function pollExecutionResultViaJolokia(id, j4p, raw, status, out, errorHandler) {
    const sleep = 3000;
    let iterations = 1200000 / sleep;
    const start = Date.now();

    const refreshResult = function () {
        j4p.execute("com.forkshunter:type=RemoteCommandProcessor", "executionResult", id, {
            success: function (res) {
                if (res.status === 'WAITING' && iterations-- > 0)
                    setTimeout(refreshResult, sleep);

                if (id === -1000) {
                    status.text('Use scan report from cache');
                } else {
                    status.text(`${res.status} | ${((Date.now() - start) / 1000.0).toFixed(2)}s`);
                }

                for (const msg of res.messages) {
                    out.append(raw ? msg : document.createTextNode(msg));
                }
            },
            error: errorHandler,
            ajaxError: errorHandler
        })
    };

    setTimeout(refreshResult, 1000);
}