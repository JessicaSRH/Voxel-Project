

function readSingleFile(src) {
console.log(src);
	var reader = new FileReader();
	var q = reader.readAsText(src);
	console.log(reader.result);
}


function displayContents(contents) {
  var element = document.getElementById('file-content');
  element.innerHTML = contents;
}

window.onload = function(e){
	var txt = '';
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function(){
	if(xmlhttp.status == 200 && xmlhttp.readyState == 4){
	txt = xmlhttp.responseText;
	}
	};
	xmlhttp.open("GET","file:///C:/Users/johnn_000/Documents/GitHub/Minecraft-Project/js/test.txt",true);
	xmlhttp.send();
	console.log(txt);
}