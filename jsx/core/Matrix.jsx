/**
 * BolasPro v4.0 - Matrix Module
 * 3D matrix operations for rotation and transformation
 */

var Matrix = {
    /**
     * Multiply two 3x3 matrices
     */
    multiply: function(a, b) {
        var r = [[0,0,0], [0,0,0], [0,0,0]];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                for (var k = 0; k < 3; k++) {
                    r[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return r;
    },
    
    /**
     * Transform a 3D vector by a matrix
     */
    transform: function(m, v) {
        return [
            m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
            m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
            m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2]
        ];
    },
    
    /**
     * Create rotation matrix from Euler angles (ZYX order)
     */
    rotation: function(x, y, z) {
        var rx = Utils.degToRad(x), ry = Utils.degToRad(y), rz = Utils.degToRad(z);
        var cx = Math.cos(rx), sx = Math.sin(rx);
        var cy = Math.cos(ry), sy = Math.sin(ry);
        var cz = Math.cos(rz), sz = Math.sin(rz);
        
        return [
            [cy*cz, -cy*sz, sy],
            [sx*sy*cz + cx*sz, -sx*sy*sz + cx*cz, -sx*cy],
            [-cx*sy*cz + sx*sz, cx*sy*sz + sx*cz, cx*cy]
        ];
    },
    
    /**
     * Get rotation matrix from layer at specific time
     */
    getLayerMatrix: function(layer, time) {
        if (!layer.threeDLayer) {
            var rz = layer.rotation.valueAtTime(time, false);
            var c = Math.cos(Utils.degToRad(rz)), s = Math.sin(Utils.degToRad(rz));
            return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
        }
        var rot = layer.property(Config.AE.TRANSFORM);
        return this.rotation(
            rot.property(Config.AE.ROTATION_X).valueAtTime(time, false),
            rot.property(Config.AE.ROTATION_Y).valueAtTime(time, false),
            rot.property(Config.AE.ROTATION).valueAtTime(time, false)
        );
    }
};
