/**
 * @author nstelt3@illinois.edu (Nolan Stelter)
 */

//cube map var
var cubeMap;

var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-2.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var nMatrix = mat3.create();
var inverseViewTransform = mat4.create(); 

var gl;
var canvas;
var newRotMat = mat3.create();

//var for shader program
var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

var teapotVertexPositionBuffer;
    
var teapotVertexNormalBuffer;
  
var teapotFaceBuffer;

// vars to hold cubemap textures

var cubeImage;
var cubeTexture;
var cubeImage2;
var cubeTexture2;
var cubeImage3;
var cubeTexture3;
var cubeImage3;
var cubeTexture3;
var cubeImage4;
var cubeTexture4;
var cubeImage5;
var cubeTexture5;

// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

//Code to handle user interaction
var currentlyPressedKeys = {};

/** update the currently pressed keys array with true to represent that a key is currently being pressed
 *  @param {event} even of key being pressed down
 */
function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
}

/** update the currently pressed keys array with false to represent that a key has stopped being pressed
 *  @param {event} even of key being let up
 */
function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
}


//global vars used for rotatation of objects
var teapot_turn = degToRad(0); 
var background_turn = degToRad(0);

/** Handle the input of keys and update the corresponding yaw, pitch, and roll variables, as well as movement speed increase and decrease. 
 */
function handleKeys() {
 
        if (currentlyPressedKeys[90]) {  //make camera roll to left
            // Left cursor key or A
	       teapot_turn += 0.05;
        } 
        else if (currentlyPressedKeys[88]) {
            // Up cursor key or W
           background_turn += 0.05; 
        }
	 
	
}

/**
 * Sends Normal matrix to shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
  gl.uniformMatrix4fv(shaderProgram.inverseViewTransform, false, inverseViewTransform);
}

/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
    //console.log("SETTING UP SHADER FOR CUBE\n");
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  
    
  
  shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
  //console.log("Tex coord attrib: ", shaderProgram.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram.texCoordAttribute);
    
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  //console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

}

/**
 * Loads Teapot Shaders
 */
function setupTeapotShaders(){
   
    //load phong vertex and fragment shaders
  vertexShader = loadShaderFromDOM("shader-phong-phong-vs");
  fragmentShader = loadShaderFromDOM("shader-phong-phong-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
  shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
  shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

  shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");    
    
    
  //console.log("lodaded phong shaders\n");
    
}

/**
 * Loads Normal Mapping Shaders
 */
function setupNormalMappingShaders()
{
  vertexShader = loadShaderFromDOM("cube_map-vs");
  fragmentShader = loadShaderFromDOM("cube_map-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }
    
    

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "vNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  
  shaderProgram.reflectionRotationVector = gl.getUniformLocation(shaderProgram, "refTransform");
  shaderProgram.inverseViewTransform = gl.getUniformLocation(shaderProgram, "inverseViewTransform");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    
}

//global teapot buffers
var teapot_verts = [];
var teapot_normals = [];
var teapot_faces = [];
var num_faces = 0;
var num_verts = 0;
/**
 * Initializes teapot buffers 
 * @pinput {string} string consisting of teapot file contents, called as callback method of readText
 */
function generateNormals()
{
    
    for(var i = 0; i < teapot_faces.length; i+= 3)
    {  
        var p1_x = teapot_verts[teapot_faces[i]*3];
        var p1_y = teapot_verts[(teapot_faces[i]*3)+1];
        var p1_z = teapot_verts[(teapot_faces[i]*3)+2];
        
        var p2_x = teapot_verts[(teapot_faces[i+1] * 3)];
        var p2_y = teapot_verts[(teapot_faces[i+1] * 3)+1];
        var p2_z = teapot_verts[(teapot_faces[i+1] * 3)+2];
        
        var p3_x = teapot_verts[(teapot_faces[i+2] * 3)];
        var p3_y = teapot_verts[(teapot_faces[i+2] * 3)+1];
        var p3_z = teapot_verts[(teapot_faces[i+2] * 3)+2];
        
        var p1 = vec3.fromValues(p1_x, p1_y, p1_z);
        var p2 = vec3.fromValues(p2_x, p2_y, p2_z);
        var p3 = vec3.fromValues(p3_x, p3_y, p3_z);
        
        var u = vec3.fromValues(0,0,0); 
        var v = vec3.fromValues(0,0,0); 
        
        vec3.sub(u, p2, p1);
        vec3.sub(v, p3, p1);
        //console.log("V: " + v + "\n");
        //console.log("U: " + u + "\n");
        var result = vec3.fromValues(0,0,0);
        
       
        vec3.cross(result, u, v);
        
            
        vec3.normalize(result, result);
        
        teapot_normals[teapot_faces[i]*3] += result[0];
        
        teapot_normals[(teapot_faces[i]*3)+1] += result[1]; 
        teapot_normals[(teapot_faces[i]* 3)+2] += result[2];
        
        teapot_normals[(teapot_faces[i+1] * 3)] += result[0];
        teapot_normals[(teapot_faces[i+1] * 3)+1] += result[1];
        teapot_normals[(teapot_faces[i+1] * 3)+2] += result[2];
        
        teapot_normals[(teapot_faces[i+2] * 3)] += result[0];
        teapot_normals[(teapot_faces[i+2] * 3)+1] += result[1];
        teapot_normals[(teapot_faces[i+2] * 3)+2] += result[2];
        
    
        
        
    }
}

function setupTeapotBuffers(input)
{
    var points;
    var no_v;

    //var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    //readTextFile("teapot_0.obj", get_data)
    var line_array = input.split( "\n" );
    var counter = 0;
    
    while(counter < 3458)
    {
        //console.log("curr line: " + line_array[counter][0]);
        if(line_array[counter][0] == "v")
        {
            no_v = line_array[counter].split("v");
            //console.log("no_v[1]; " + no_v[1]); 
            points = no_v[1].split(" "); 
            var pt = vec3.fromValues(Number(points[1]), Number(points[2]), Number(points[3]));
            teapot_verts.push(pt[0]);
            teapot_verts.push(pt[1]);
            teapot_verts.push(pt[2]);
            teapot_normals.push(0);
            teapot_normals.push(0);
            teapot_normals.push(0);
        
            num_verts += 3; 
            
        }
        else 
        {
            
            no_v = line_array[counter].split("f");
            points = no_v[1].split(" "); 
            var pt = vec3.fromValues(Number(points[2])-1, Number(points[3])-1, Number(points[4])-1);
            //teapot_faces.push(pt);
            teapot_faces.push(pt[0]); 
            teapot_faces.push(pt[1]); 
            teapot_faces.push(pt[2]); 
            num_faces++;
        } 
                     

        counter++;
        
    }
    
    generateNormals();
   
    
            
    teapotVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapot_verts),
                  gl.STATIC_DRAW);
    teapotVertexPositionBuffer.itemSize = 3;
    teapotVertexPositionBuffer.numItems = num_verts;
    
    teapotVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapot_normals),
                  gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = num_verts;
    
    //console.log("size of facebuffer: " + teapot_faces.length);
    teapotFaceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotFaceBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapot_faces),
                  gl.STATIC_DRAW);
    teapotFaceBuffer.itemSize = 3;
    teapotFaceBuffer.numItems = num_faces; 
    
}



//globals for teapot model transformation
var translation_2 = vec3.create();
vec3.set(translation_2, 0, -2, 0); 

/**
 * Binds teapot buffers and draws the teapot
 */
function drawTeapot()
{
    
    gl.polygonOffset(0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexPositionBuffer);

    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Bind normal buffer

    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);   
    
    

    var s = vec3.create();
    vec3.set(s, 0.05,0.05, 0.05);
    mat4.scale(mvMatrix, mvMatrix, s); 
    
    if(document.getElementById("normal_mapping").checked)
    {         
       
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, "texMap"), 0);
    
    }
    
    setMatrixUniforms();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotFaceBuffer);

    gl.drawElements(gl.TRIANGLES, 6768 , gl.UNSIGNED_SHORT,0);  
    
}


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color 
 * @param {Float32} the shininess exponent for Phong illumination
 */
function uploadMaterialToShader(dcolor, acolor, scolor,shiny) {
    //console.log("color " + dcolor);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);
    
  gl.uniform1f(shaderProgram.uniformShininess, shiny);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {

  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s); 
}
/**
 * Draw a cube based on buffers.
 */
function drawCube(){

  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 3, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the faces.

    
    gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
    //gl.activeTexture(gl.TEXTURE1);
  //gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);

  // Draw the cube.

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}


//vars to represent camera loc and orientation
eyePt = vec3.fromValues(0.0,0.0,10.0);
viewDir = vec3.fromValues(0.0,0.0,-1.0);
up = vec3.fromValues(0.0,1.0,0.0);
viewPt = vec3.fromValues(0.0,0.0,0.0);


/**
 * Draw call that applies matrix transformations to camera and teapot, and sets up the two shaders, and then the calls drawing functions
 for the texture cube and the teapot
 */

function draw() {   

    var transformVec = vec3.create();
 
  
  
    vec3.set(transformVec,0.0,0.0, 9.1);
    
   

    mat4.translate(mvMatrix, mvMatrix,transformVec);

    mat4.rotateY(mvMatrix,mvMatrix, background_turn); //
    mat3.fromMat4(newRotMat, mvMatrix);
    
    setupShaders();
    mvPushMatrix();
    var transformVec = vec3.create();
 
   
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    
    //Draw 
    setMatrixUniforms();    
    drawCube();
    mvPopMatrix(); 
    
   
    //nMatrix = mat3.create();
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);  
    
  
    
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
  
    
    //console.log("HEEEE " + inverseViewTransform);
    
    mvPushMatrix();
    
    
    //vec3.add(viewDir, viewDir, vec3.fromValues(0.02, 0.0, 0.0));
      
    mat3.fromMat4(inverseViewTransform, mvMatrix);
    mat3.invert(inverseViewTransform,inverseViewTransform);
    if (document.getElementById("phong_shading").checked)
    {
        //console.log("PHONG\n");
        setupTeapotShaders();
    }
    else 
    {
        //console.log("NORMAL\n");
        setupNormalMappingShaders();
    }
    
    
     
    
    //readText( )   //not->setupTeapotBuffers();
  
    
    
    vec3.set(transformVec,0.0, -0.1,  9.0);
    //vec3.set(transformVec, 0, 0.0 , -1.0);
    
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateY(mvMatrix, mvMatrix, teapot_turn);//modelXRotationRadians); //teapot_turn);
  
    R=1.0;G=0.1;B=0.2;shiny=20.0; 
    
    uploadLightsToShader([0.0, 2.0, 9.0],[0.0,0.0,0.0],[1.0,1.0,1.0],[1.0,1.0,1.0]);
    uploadMaterialToShader([R,G,B],[R,G,B],[1.0,1.0,1.0],shiny);
    setMatrixUniforms(); 
    
    gl.uniformMatrix3fv(shaderProgram.reflectionRotationVector, false, newRotMat);
    drawTeapot();
    
    mvPopMatrix();
    
    
     
    
  
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        modelXRotationRadians += 0.5 * deltaTime;
        modelYRotationRadians += 0.03 * deltaTime;  
    }
}


/**
 * Creates textue cube and applies the 6 textues
 */
function setupTextures() {
  
    
  //START OF CUBEMAP STUFF!!      

  cubeMap = gl.createTexture();

  gl.activeTexture( gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    
  
  //gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 0, 255]));

  cubeMapImage1 = new Image(); 
  cubeMapImage1.onload = function() { handleTextureLoaded(cubeMapImage1, cubeMap, 1);  }
  cubeMapImage1.src = "pos-x.png"; 
    
    
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 0, 255]));

  cubeMapImage2 = new Image();
  cubeMapImage2.onload = function() { handleTextureLoaded(cubeMapImage2, cubeMap, 2);  }
  cubeMapImage2.src= "neg-x.png";
  
    
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 0, 255]));
    

  cubeMapImage3  = new Image();

  cubeMapImage3.onload = function() { handleTextureLoaded(cubeMapImage3, cubeMap, 3);  }
  cubeMapImage3.src = "pos-y.png";
    
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 0, 255]));

  cubeMapImage4 = new Image();

  cubeMapImage4.onload = function() { handleTextureLoaded(cubeMapImage4, cubeMap, 4);  }
  cubeMapImage4.src = "neg-y.png";

    
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 0, 255]));
 
  cubeMapImage5  = new Image();

  cubeMapImage5.onload = function() { handleTextureLoaded(cubeMapImage5, cubeMap, 5);  }
  cubeMapImage5.src = "pos-z.png";   
    
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 0, 255]));

  cubeMapImage6 = new Image();
  cubeMapImage6.onload = function() { handleTextureLoaded(cubeMapImage6, cubeMap, 6);  }
  cubeMapImage6.src = "neg-z.png";  

 

}


/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture, num) {
  //console.log("handleTextureLoaded, image = " + image);
    //console.log("ASSS\n");
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  //console.log("ass " + image.src);
  if(num == 1)
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  
  if(num == 2)
   gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);    
    
    if(num == 3)
   gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);  
    if(num == 4)
   gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);  
    if(num == 5)
   gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);  
    if(num == 6)
   gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);  
    
    
    
    
    
    // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
     gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     //console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     //console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * Populate buffers with data
 */
function setupBuffers() {

  // Create a buffer for the cube's vertices.

  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.

  var vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Map the texture onto the cube's faces.

  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  //need to change, coords are clockwise
  var textureCoordinates = [
    // Front
      //used
     -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}


/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);

  
  setupShaders();
  setupTeapotShaders();

  setupBuffers();
  
  setupTextures();
    
  readTextFile("teapot_0.obj",setupTeapotBuffers);  
  
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
     
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    handleKeys();
    draw();
    
    
    animate();
}

