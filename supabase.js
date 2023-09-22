import config from "./config.json" assert { "type": "json" };
import { createClient } from "@supabase/supabase-js";
import fs from 'fs';


const { supabaseUrl, supabaseKey } = config;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

const loadInvocations = () => {
    try {
      const data = fs.readFileSync("./invocations.json", "utf8");
      return JSON.parse(data);
    } catch (err) {
      console.error(err);
      return {};
    }
  };


// upload invocations.json to supabase
const upload = async () => {
    const invocations = loadInvocations();
    // for each user, upsert to supabase table
    // key is userId

    const invocationsArr = []
    for (const userName in invocations) {
        const user = invocations[userName];
        invocationsArr.push({
            username: userName,
            commands: user.commands,
            commandInvocations: user.commandInvocations,
            tier: user.tier,
            lifetimeInvocations: user.lifetimeInvocations,
            dayOfSignup: new Date(user.dayOfSignup), // str to date 
        })
    }

    
    uploadToSupabase(invocationsArr);
}


const uploadToSupabase = async (invocations) => {
    for (const userIdx in invocations) {
        const user = invocations[userIdx];
        const { data, error } = await supabase
            .from('invocations')
            .upsert({
                username: user.username,
                commands: user.commands,
                commandInvocations: user.commandInvocations,
                isMember: user.isMember,
                dayOfSignup: user.dayOfSignup,
                tier: user.tier,
                lifetimeInvocations: user.lifetimeInvocations,
            }, {
                onConflict: 'username', // Handle conflicts
                returning: 'minimal', // Don't return the result after the insert
            });

        if (error) {
            console.error('Error uploading data to Supabase:', error);
        }
    }
}

const downloadFromSupabase = async () => {
    const { data, error } = await supabase
        .from('invocations')
        .select('*');

    if (error) {
        console.error('Error downloading data from Supabase:', error);
    }

    return data;
}




const jsonToCsvBooks = (filename) => {
    const data = fs.readFileSync(filename, "utf8");
    const json = JSON.parse(data).books;
    
    const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
    const header = Object.keys(json[0])
    let csv = json.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    csv.unshift(header.join(','))
    csv = csv.join('\r\n')

    fs.writeFileSync(`./${filename}.csv`, csv)

    return csv
}

/*
{
    "aart" : {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "quos" : {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "curio" : {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "random" : {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "repost": {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "summarize": {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "share": {
        "free": 3,
        "member": 20,
        "paid": 50
    },
    "delve": {
        "free": 3,
        "member": 20,
        "paid": 50
    }
}
*/

const jsonToCsvCommandLimts = (filename) => {
    const data = fs.readFileSync(filename, "utf8");
    const json = JSON.parse(data)
    // convert to array of objects
    const arr = []
    for (const command in json) {
        const obj = {
            command: command,
            free: json[command].free,
            member: json[command].member,
            paid: json[command].paid,
        }
        arr.push(obj)
    }

    const replacer = (key, value) => value === null ? '' : value // specify how you want to handle null values here
    const header = Object.keys(arr[0])
    let csv = arr.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    csv.unshift(header.join(','))
    csv = csv.join('\r\n')

    fs.writeFileSync(`./${filename}.csv`, csv)

    return csv
}

// (async () => {
//     await upload();
// })();


// jsonToCsvCommandLimts('./command_limits.json')