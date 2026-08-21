const cores = ['indigo', 'amber', 'emerald', 'sky', 'rose', 'violet', 'slate'];
const dinamicas = [];
cores.forEach(function (c) {
    ['400', '500', '600'].forEach(function (t) {
        dinamicas.push('bg-' + c + '-' + t, 'hover:bg-' + c + '-' + t, 'bg-' + c + '-' + t + '/80', 'bg-' + c + '-' + t + '/15',
                       'text-' + c + '-' + t, 'border-' + c + '-' + t, 'border-' + c + '-' + t + '/30', 'from-' + c + '-' + t);
    });
});

module.exports = {
    content: ['./**/*.html', './**/*.js'],
    safelist: dinamicas,
    theme: {
        extend: {
            colors: { slate: { 850: '#172033' } }
        }
    }
};
