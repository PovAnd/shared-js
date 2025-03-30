function detailClick(input) {
    let form = input.parentElement;
    const url = new URL(window.location.href);
    const arg = url.searchParams.get('arg');
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
    if (form.userText && form.userText.value) {
        newArg += `;${form.id}:${form.userText.value}`;
    }
    url.searchParams.set('arg', newArg);
    let ifrm = document.createElement("iframe");
    ifrm.setAttribute('src', url.toString());
    ifrm.setAttribute('style', 'display: block; width: 100%; height: 100%; border: none;');
    form.parentElement.replaceChild(ifrm, form);
}