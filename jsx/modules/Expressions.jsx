/**
 * BolasPro v4.0 - Expressions Module
 * Expression templates with comprehensive error handling
 */

var Expressions = {
    /**
     * Generate position expression
     */
    position: function(hunterIndex, hunterName, is3D) {
        var esc = Utils.escapeName(hunterName);
        var expr = [
            '// BolasPro Position v5.0 with Spring & Elastic Physics',
            'try {',
            '    var hunter = null;',
            '    try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
            '    if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
            '    if (!hunter) throw "Hunter not found";',
            '    ',
            '    var posDelay = 0;',
            '    try { posDelay = Math.max(0, effect("' + Config.EFFECTS.POSITION_DELAY + '")("Slider").value); } catch(e) {}',
            '    var effectiveTime = Math.max(0, time - posDelay);',
            '    ',
            '    var snagPt = 5;',
            '    try {',
            '        snagPt = effect("' + Config.EFFECTS.SNAG_POINT + '")("Slider").value;',
            '        snagPt = clamp(Math.round(snagPt), 1, 9);',
            '    } catch(e) {}',
            '    ',
            '    var ratios = [[0,0],[0.5,0],[1,0],[0,0.5],[0.5,0.5],[1,0.5],[0,1],[0.5,1],[1,1]];',
            '    var ratio = ratios[snagPt - 1];',
            '    ',
            '    var rect = hunter.sourceRectAtTime(effectiveTime, false);',
            '    var snagPos = [',
            '        rect.left + rect.width * ratio[0],',
            '        rect.top + rect.height * ratio[1]',
            is3D ? '        ,0' : '',
            '    ];',
            '    ',
            '    var basePos = hunter.toWorld(snagPos, effectiveTime);',
            '    ',
            '    // BolasPro v5.0 Spring & Elastic Secondary Motion Physics (FEAT-02)',
            '    var springFreq = 0;',
            '    var springDamp = 2;',
            '    try { springFreq = Math.max(0, effect("' + Config.EFFECTS.SPRING + '")("Slider").value); } catch(e) {}',
            '    try { springDamp = Math.max(0, effect("' + Config.EFFECTS.DAMPING + '")("Slider").value); } catch(e) {}',
            '    if (springFreq > 0) {',
            '        var curTargetPos = hunter.toWorld(snagPos, time);',
            '        var lagVector = curTargetPos - basePos;',
            '        var springFactor = Math.sin(springFreq * Math.PI * 2 * effectiveTime) * Math.exp(-springDamp * Math.max(0.01, posDelay));',
            '        basePos = basePos + lagVector * springFactor;',
            '    }',
            '    ',
            '    var offX = 0, offY = 0, offZ = 0;',
            '    try { offX = effect("' + Config.EFFECTS.OFFSET_X + '")("Slider").value; } catch(e) {}',
            '    try { offY = effect("' + Config.EFFECTS.OFFSET_Y + '")("Slider").value; } catch(e) {}'
        ];
        
        if (is3D) {
            expr.push('    try { offZ = effect("' + Config.EFFECTS.OFFSET_Z + '")("Slider").value; } catch(e) {}');
            expr.push('    basePos + [offX, offY, offZ];');
        } else {
            expr.push('    basePos + [offX, offY];');
        }
        
        expr.push('} catch(e) { value; }');
        return expr.join('\n');
    },
    
    /**
     * Generate anchor expression
     */
    anchor: function() {
        return [
            '// BolasPro Anchor v4.0',
            'try {',
            '    var preyAnchor = 5;',
            '    try {',
            '        preyAnchor = effect("' + Config.EFFECTS.PREY_ANCHOR + '")("Slider").value;',
            '        preyAnchor = clamp(Math.round(preyAnchor), 1, 9);',
            '    } catch(e) {}',
            '    ',
            '    var ratios = [[0,0],[0.5,0],[1,0],[0,0.5],[0.5,0.5],[1,0.5],[0,1],[0.5,1],[1,1]];',
            '    var ratio = ratios[preyAnchor - 1];',
            '    ',
            '    var rect = sourceRectAtTime(time, false);',
            '    [rect.left + rect.width * ratio[0], rect.top + rect.height * ratio[1]];',
            '} catch(e) { value; }'
        ].join('\n');
    },
    
    /**
     * Generate rotation expression for 2D
     */
    rotation: function(hunterIndex, hunterName) {
        var esc = Utils.escapeName(hunterName);
        return [
            '// BolasPro Rotation v4.0',
            'var result = value;',
            'try {',
            '    var lockOn = effect("' + Config.EFFECTS.LOCK_ORIENTATION + '")("Checkbox").value == 1;',
            '    if (lockOn) {',
            '        var hunter = null;',
            '        try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
            '        if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
            '        if (hunter) {',
            '            var d = 0;',
            '            try { d = Math.max(0, effect("' + Config.EFFECTS.ROTATION_DELAY + '")("Slider").value); } catch(e) {}',
            '            var t = Math.max(0, time - d);',
            '            result = hunter.transform.rotation.valueAtTime(t);',
            '        }',
            '    }',
            '} catch(e) {}',
            'result;'
        ].join('\n');
    },
    
    /**
     * Generate 3D rotation expression
     */
    rotation3D: function(hunterIndex, hunterName, axis) {
        var esc = Utils.escapeName(hunterName);
        var propName = axis === 'x' ? 'xRotation' : (axis === 'y' ? 'yRotation' : 'rotation');
        return [
            '// BolasPro 3D Rotation v4.0 (' + axis.toUpperCase() + ')',
            'var result = value;',
            'try {',
            '    var lockOn = effect("' + Config.EFFECTS.LOCK_ORIENTATION + '")("Checkbox").value == 1;',
            '    if (lockOn) {',
            '        var hunter = null;',
            '        try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
            '        if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
            '        if (hunter) {',
            '            var d = 0;',
            '            try { d = Math.max(0, effect("' + Config.EFFECTS.ROTATION_DELAY + '")("Slider").value); } catch(e) {}',
            '            var t = Math.max(0, time - d);',
            '            result = hunter.' + propName + '.valueAtTime(t);',
            '        }',
            '    }',
            '} catch(e) {}',
            'result;'
        ].join('\n');
    },
    
    /**
     * Generate orientation expression for 3D
     */
    orientation: function(hunterIndex, hunterName) {
        var esc = Utils.escapeName(hunterName);
        return [
            '// BolasPro Orientation v4.0',
            'var result = value;',
            'try {',
            '    var lockOn = effect("' + Config.EFFECTS.LOCK_ORIENTATION + '")("Checkbox").value == 1;',
            '    if (lockOn) {',
            '        var hunter = null;',
            '        try { hunter = thisComp.layer("' + esc + '"); } catch(e) {}',
            '        if (!hunter) try { hunter = thisComp.layer(' + hunterIndex + '); } catch(e) {}',
            '        if (hunter) {',
            '            var d = 0;',
            '            try { d = Math.max(0, effect("' + Config.EFFECTS.ROTATION_DELAY + '")("Slider").value); } catch(e) {}',
            '            var t = Math.max(0, time - d);',
            '            result = hunter.orientation.valueAtTime(t);',
            '        }',
            '    }',
            '} catch(e) {}',
            'result;'
        ].join('\n');
    }
};
