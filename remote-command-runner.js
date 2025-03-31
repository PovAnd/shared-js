$(function () {
    handleRequest();
});

function handleRequest(input) {
    let status = $('#status')
    let form = input ? input.parentElement : null;
    if (form) {
        let div = document.createElement("div");
        status.parentElement.append(div);
        status = div;
        form.remove();
    }
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

    let out = $('#output');
    if (form) {
        let div = document.createElement("div");
        out.parentElement.append(div);
        out = div;
    }

    if (raw0)
        out.addClass("raw0")
    const start = Date.now();
    const errorHandler = function (res) {
        status.text('ERROR');
        out.append(document.createTextNode(res.stacktrace ? res.stacktrace : JSON.stringify(res)));
    }

    const args = []

    function handleInitialSuccess(id) {
        const sleep = 3000;
        let iterations = 1200000 / sleep;

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

    args.push("com.forkshunter:type=RemoteCommandProcessor")
    if (routes) {
        args.push('requestExecuteMulti')
        args.push(routes);
    } else {
        args.push('requestExecute')
    }
    args.push(command)
    args.push(arg)
    args.push({
        success: handleInitialSuccess,
        error: errorHandler,
        ajaxError: errorHandler
    });

    j4p.execute(...args)
}
