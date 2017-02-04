const { server } = require('../');


const app = server('my.db');


app.listen(process.env.PORT || 3000, () => console.log('listening'));
