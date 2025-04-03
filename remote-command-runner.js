$(function () {
    remoteAction();
});

function outputStyle() {
    return 'white-space: pre; font-family: monospace;'
}

function findContainerById(form, id) {
    let container = $(`#${id}`);

    if (container.length === 0) {
        container = $('<div>', {
            id: id,
            style: outputStyle()
        }).appendTo('body');
    }

    if (form) {
        const formName = `${id}-${form.id}`;
        const inner = $('<div>', {
            id: formName,
            style: outputStyle()
        }).appendTo(container);
        return $(`#${formName}`);
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

    const mbean = "com.forkshunter:type=RemoteCommandProcessor";
    const jolokia = createJolokia(addr);

    const successHandler = function (mainRes) {
        const sleep = 3000;
        const start = Date.now();
        let iterations = 1200000 / sleep;
        const refreshResult = function () {
            jolokia.execute(mbean, "executionResult", mainRes, {
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

    jolokia.execute(mbean,
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