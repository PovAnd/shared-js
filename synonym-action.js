function detailClick(input) {
    let params = new URLSearchParams(location.search);
    modifyArg(params);
    handleRequest(input, params);
}

function modifyArg(params){
    const arg = params.get('arg');
    let newArg;
    if (arg && arg.trim() !== '') {
        newArg = arg.indexOf('mode:') < 0 ?
            arg + `;mode:${form.id}`
            :
            arg.split(';').map(part => {
                if (part.startsWith('mode:')) {
                    return `mode:${form.id}`;
                }
                return part;
            }).join(';');
    } else {
        newArg = `mode:${form.id}`;
    }
    params.set('arg', newArg);
}