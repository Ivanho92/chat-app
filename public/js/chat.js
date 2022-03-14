const socket = io();

// Fetch DOM elements
const $form = document.querySelector('#msg-form');
const $msgFormInput = $form.querySelector('input');
const $msgFormBtn = $form.querySelector('button');
const $sendLocationBtn = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');
const $sidebar = document.querySelector('#sidebar');

// Mustache Templates
const msgTemplate = document.querySelector('#msg-template').innerHTML;
const locationURLTemplate = document.querySelector('#location-url-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

function autoscroll() {
    const $newMsg = $messages.lastElementChild;

    // Height of the new message
    const newMsgStyles = getComputedStyle($newMsg);
    const newMsgMargin = parseInt(newMsgStyles.marginBottom);
    const newMsgHeight = $newMsg.offsetHeight + newMsgMargin;

    // Visible height
    const visibleHeight = $messages.offsetHeight;

    // Height of messages container
    const containerHeight = $messages.scrollHeight;

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    // Check if scroll was already on last message. If yes, scroll to last message
    if (containerHeight - newMsgHeight <= scrollOffset) { 
        $messages.scrollTop = $messages.scrollHeight;
    }
}

// App
socket.on('message', message => {
    console.log(message);
    const html = Mustache.render(msgTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('locationMessage', locationMsg => {
    console.log(locationMsg);
    const html = Mustache.render(locationURLTemplate, {
        username: locationMsg.username,
        locationURL: locationMsg.url,
        createdAt: moment(locationMsg.createdAt).format('HH:mm')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll();
});

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    sidebar.innerHTML = html;
});

$form.addEventListener('submit', e => {
    e.preventDefault();

    $msgFormBtn.setAttribute('disabled', '');
   
    socket.emit('sendMessage', $msgFormInput.value, error => {
        $msgFormBtn.removeAttribute('disabled');
        $msgFormInput.value = '';
        $msgFormInput.focus();

        if (error) return console.log(error);
        console.log(`Message delivered!`);
    });
});

$sendLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser.');

    $sendLocationBtn.setAttribute('disabled', '');

    navigator.geolocation.getCurrentPosition(position => {  
        socket.emit('sendLocation', {
            lat: position.coords.latitude,
            long: position.coords.longitude
        }, () => {
            $sendLocationBtn.removeAttribute('disabled');
            console.log('Location shared!');
        });
    })
});

socket.emit('join', { username, room }, error => {
    if (error) {
        alert(error);
        location.href = "/";
    } 
});