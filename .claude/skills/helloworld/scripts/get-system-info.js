const os =  require('os');
console.log('Platform: ' + os.platform());
console.log('Architecture: ' + os.arch());
console.log('CPU Cores: ' + os.cpus().length);