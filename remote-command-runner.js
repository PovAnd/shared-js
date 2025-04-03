$(function () {
    remoteAction();
});


function findContainerById(form, id) {
    let container = $(`#${id}`);
    if (container.length === 0) {
        $('<div>', {id}).appendTo('body');
        container = $(`#${id}`);
    }
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

function createJolokia(addr) {
    let endpoint;
    if (addr) {
        endpoint = addr;
    } else {
        const juiIndex = window.juiIndex ?? '0';
        endpoint = `https://${location.hostname}/jolokia/jui-${juiIndex}`;
    }
    return new Jolokia(endpoint);
}

function remoteAction(input) {
    let form = input ? input.parentElement : null;
    let status = findContainerById(form, 'status');
    const params = new URLSearchParams(location.search);
    const addr = params.get('addr');
    const routes = params.get('route') || params.get('routes');

    if (!addr && !routes) {
        status.text('Provide address or route!')
        return
    }

    const command = params.get('command');
    if (!command) {
        status.text('Provide command!')
        return
    }

    const arg = params.get('arg') || '';

    let out = findContainerById(form, 'output');
    if (form) {
        form.remove();
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

    const errorHandler = function (res) {
        status.text('ERROR');
        out.append(document.createTextNode(res.stacktrace ? res.stacktrace : JSON.stringify(res)));
    };

    const jolokia = createJolokia(addr);
    const successHandler = function (mainRes) {
        const sleep = 3000;
        const start = Date.now();
        let iterations = 1200000 / sleep;
        const refreshResult = function () {
            jolokia.execute("com.forkshunter:type=RemoteCommandProcessor", "executionResult", mainRes, {
                success: function (res) {
                    if (res.status === 'WAITING' && iterations-- > 0)
                        setTimeout(refreshResult, sleep);

                    if (mainRes === -1000) {
                        status.text('Use scan report from cache');
                    } else {
                        status.text(`${res.status} | ${((Date.now() - start) / 1000.0).toFixed(2)}s`);
                    }

                    for (const msg of res.messages) {
                        //out.append(document.createTextNode(msg));
                        out.append(msg);
                    }
                },
                error: errorHandler,
                ajaxError: errorHandler
            })
        };

        setTimeout(refreshResult, 1000);
    };

    jolokia.execute("com.forkshunter:type=RemoteCommandProcessor",
        routes ? "requestExecuteMulti" : "requestExecute",
        ...(routes ? [routes] : []),
        command,
        arg,
        payload.size > 0 ? JSON.stringify(Object.fromEntries(payload)) : "",
        {
            method: method,
            success: successHandler,
            error: errorHandler,
            ajaxError: errorHandler
        }
    );
}