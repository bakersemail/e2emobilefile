import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Text, View, Button} from 'react-native';
import * as openpgp from 'react-native-openpgp';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import base64 from 'react-native-base64'



// note: do not use compression - the zlib library does not work reliably natively for some reason
// gpg --encrypt --compress-level 0 --armor dummy.pdf 
const passphrase = 'super long and hard to guess secret' 

function parseMessage(message, format) {
  if (format === 'binary') {
    return {
      data: message.getLiteralData(),
      filename: message.getFilename()
    };
  } else if (format === 'utf8') {
    return {
      data: message.getText(),
      filename: message.getFilename()
    };
  } else {
    throw new Error('Invalid format');
  }
}

const App = () => {
  const [isLoading, setLoading] = useState(false)
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('generate private key')
  const [generatedPublicKey, setGeneratedPublicKey] = useState('generate public key')
  
  const generateKeys = async () => {
    // these options used when generating the keys originally
    var options = {
      userIds: [{ name:'Jon Smith', email:'jon@example.com' }],
      numBits: 2048,
      passphrase: passphrase
    };

    try {
      setLoading(true)
      openpgp.generateKey(options).then((keypair) => {      
        setGeneratedPrivateKey(keypair.privateKeyArmored)
        setGeneratedPublicKey(keypair.publicKeyArmored)
      })
    } catch(error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const decryptFile = async () => {
    setLoading(true)
    try {
      const [prikey, testmsg] = await Promise.all([
        (await fetch('https://raw.githubusercontent.com/bakersemail/e2emobilefile/main/test.pri')).text(),
        (await fetch('https://raw.githubusercontent.com/bakersemail/e2emobilefile/main/testmsg.txt')).text()
      ])

      const message = openpgp.readMessage(testmsg)
      const keys = openpgp.readArmoredKey(prikey)
      const decKey = openpgp.decryptKey({ 
        privateKey: keys.keys[0],
        passphrase: passphrase
      })
      
      const decMessage = message.decrypt(decKey.key)
      const parsed = parseMessage(decMessage, 'binary')      
      const b64Data = base64.encodeFromByteArray(parsed.data)
      const fileUri = FileSystem.documentDirectory + parsed.filename
      FileSystem.writeAsStringAsync(fileUri, b64Data, { encoding: FileSystem.EncodingType.Base64 }).then((r) => {
        Sharing.shareAsync(fileUri, { UTI: 'application/pdf' })
      })
    } catch(error) {
        console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const prepareRandom = async () => {
    try {
      openpgp.prepareRandomValues()
      return "loaded random"
    } catch (error) {
      console.error(error)
      return "failed random"
    } finally {
      setLoading(false)
    } 
  }

  useEffect(() => {
    
  }, []);

  return (
    <View style={{flex: 1, padding: 24}}>
      {isLoading ? (
        <View>
          <ActivityIndicator />
        </View>
      ) : (
        <View>
          <Button onPress={decryptFile} title="Decrypt file" />
          <Button onPress={prepareRandom} title="Load random" />
          <Button onPress={generateKeys} title="Generate keys" />
          <Text>{generatedPrivateKey}</Text>
          <Text>{generatedPublicKey}</Text>
        </View>
      )}
    </View>
  );
};

export default App;