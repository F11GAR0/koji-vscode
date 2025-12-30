import * as assert from 'assert';
import { decodeMethodResponse, encodeMethodCall } from '../src/koji/xmlrpc';

describe('koji/xmlrpc', () => {
  it('encodes a simple method call', () => {
    const xml = encodeMethodCall('listBuilds', [{}, { limit: 2 }]);
    assert.ok(xml.includes('<methodName>listBuilds</methodName>'));
    assert.ok(xml.includes('<struct>'));
    assert.ok(xml.includes('<name>limit</name>'));
    assert.ok(xml.includes('<int>2</int>'));
  });

  it('decodes a string response', () => {
    const xml = `<?xml version="1.0"?>
<methodResponse>
  <params>
    <param>
      <value><string>ok</string></value>
    </param>
  </params>
</methodResponse>`;
    assert.strictEqual(decodeMethodResponse(xml), 'ok');
  });

  it('decodes arrays and structs', () => {
    const xml = `<?xml version="1.0"?>
<methodResponse>
  <params>
    <param>
      <value>
        <array><data>
          <value><int>1</int></value>
          <value>
            <struct>
              <member><name>a</name><value><string>b</string></value></member>
              <member><name>flag</name><value><boolean>1</boolean></value></member>
            </struct>
          </value>
        </data></array>
      </value>
    </param>
  </params>
</methodResponse>`;

    const v = decodeMethodResponse(xml);
    assert.deepStrictEqual(v, [1, { a: 'b', flag: true }]);
  });

  it('throws XmlRpcFault for fault responses', () => {
    const xml = `<?xml version="1.0"?>
<methodResponse>
  <fault>
    <value>
      <struct>
        <member><name>faultCode</name><value><int>123</int></value></member>
        <member><name>faultString</name><value><string>bad</string></value></member>
      </struct>
    </value>
  </fault>
</methodResponse>`;
    assert.throws(() => decodeMethodResponse(xml), /bad/);
  });
});


