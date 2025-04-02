$(function () {
    remoteAction();
});

function findContainerById(form, id) {
    let container = $('#' + id);
    if (form) {
        let div = document.createElement("div");
        let formName = id + '-' + form.id;
        div.setAttribute('id', formName);
        container.get(0).parentElement.append(div);
        return $('#' + formName);
    } else {
        return container;
    }
}

function remoteAction(input) {
    let form = input ? input.parentElement : null;
    let status = findContainerById(form, 'status');
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

    let out = findContainerById(form, 'output');
    if (form) {
        form.remove();
    }

    if (raw0)
        out.addClass("raw0");

    const errorHandler = function (res) {
        status.text('ERROR');
        out.append(document.createTextNode(res.stacktrace ? res.stacktrace : JSON.stringify(res)));
    }

    let method = params.get('method');
    if (method) {
        method = method.toLowerCase();
    } else {
        method = 'get';
    }

    const payload = new Map();
    if (form) {
        payload.set('formId', form.id);
    }

    if (method !== 'post' && payload.size > 0) {
        method = 'post';
    }

    j4p.execute("com.forkshunter:type=RemoteCommandProcessor",
        routes ? "requestExecuteMulti" : "requestExecute",
        ...(routes ? [routes] : []),
        command,
        arg,
        payload.size > 0 ? JSON.stringify(Object.fromEntries(payload)) : "",
        {
            success: function (id) {
                pollExecutionResultViaJolokia(id, j4p, raw, status, out, errorHandler);
            },
            method: method,
            error: errorHandler,
            ajaxError: errorHandler
        }
    );
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