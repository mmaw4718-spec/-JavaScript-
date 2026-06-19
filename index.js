const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let currentDir = process.cwd();
let commandHistory = [];

const commandStructure = {
  help: { description: 'вывод списка доступных команд и их описания' },
  list: { description: 'отображение содержимого указанной папки (по умолчанию — текущей)' },
  create: { description: 'создание файла или папки (create <type> <name>)' },
  copy: { description: 'копирование файла/папки' },
  move: { description: 'перемещение файла/папки' },
  delete: { description: 'удаление файла/папки' },
  cd: { description: 'смена текущей рабочей директории' },
  exit: { description: 'завершение работы приложения' }
};

function normalizePath(p) {
  return path.resolve(currentDir, p);
}

function formatSize(size) {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
}

function listDir(targetDir = currentDir) {
  try {
    const items = fs.readdirSync(targetDir, { withFileTypes: true });
    console.log(`\nСодержимое директории: ${targetDir}`);
    console.log('─'.repeat(80));
    console.log('Имя'.padEnd(40) + 'Тип'.padEnd(10) + 'Размер'.padEnd(15) + 'Дата изменения');
    console.log('─'.repeat(80));

    items.forEach(item => {
      const fullPath = path.join(targetDir, item.name);
      const stats = fs.statSync(fullPath);
      const type = item.isDirectory() ? 'Папка' : 'Файл';
      const size = item.isDirectory() ? '-' : formatSize(stats.size);
      const mtime = stats.mtime.toLocaleString('ru-RU');
      
      console.log(item.name.padEnd(40) + type.padEnd(10) + size.padEnd(15) + mtime);
    });
    
    console.log('─'.repeat(80));
  } catch (err) {
    console.error(`Ошибка при чтении директории: ${err.message}`);
  }
}

function createItem(type, name) {
  const fullPath = normalizePath(name);
  try {
    if (type === 'file') {
      fs.writeFileSync(fullPath, '');
      console.log(`Файл создан: ${fullPath}`);
    } else if (type === 'folder') {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`Папка создана: ${fullPath}`);
    } else {
      console.error('Неизвестный тип. Используйте: file или folder');
    }
  } catch (err) {
    console.error(`Ошибка создания: ${err.message}`);
  }
}

function copyItem(source, destination) {
  const srcPath = normalizePath(source);
  const destPath = normalizePath(destination);
  try {
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
      console.log(`Папка скопирована: ${srcPath} → ${destPath}`);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Файл скопирован: ${srcPath} → ${destPath}`);
    }
  } catch (err) {
    console.error(`Ошибка копирования: ${err.message}`);
  }
}

function moveItem(source, destination) {
  const srcPath = normalizePath(source);
  const destPath = normalizePath(destination);
  try {
    fs.renameSync(srcPath, destPath);
    console.log(`Перемещено: ${srcPath} → ${destPath}`);
  } catch (err) {
    console.error(`Ошибка перемещения: ${err.message}`);
  }
}

function deleteItem(target) {
  const fullPath = normalizePath(target);
  try {
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`Папка удалена: ${fullPath}`);
    } else {
      fs.unlinkSync(fullPath);
      console.log(`Файл удалён: ${fullPath}`);
    }
  } catch (err) {
    console.error(`Ошибка удаления: ${err.message}`);
  }
}

function changeDir(newPath) {
  const fullPath = normalizePath(newPath);
  try {
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      currentDir = fullPath;
      console.log(`Текущая директория: ${currentDir}`);
    } else {
      console.error('Указанный путь не является директорией или не существует');
    }
  } catch (err) {
    console.error(`Ошибка смены директории: ${err.message}`);
  }
}

function showHelp() {
  console.log('\n=== Доступные команды ===');
  console.log('─'.repeat(60));
  Object.keys(commandStructure).forEach(cmd => {
    console.log(`${cmd.padEnd(10)}— ${commandStructure[cmd].description}`);
  });
  console.log('\nПримеры:');
  console.log('  create file test.txt');
  console.log('  create folder myfolder');
  console.log('  copy file.txt backup/');
  console.log('  move old.txt new.txt');
  console.log('  delete temp.txt');
  console.log('  cd ..');
}

function parseCommand(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  commandHistory.push(trimmed);
  if (commandHistory.length > 50) commandHistory.shift();
  
  return { command, args };
}

function executeCommand(cmdData) {
  if (!cmdData) return;
  const { command, args } = cmdData;

  switch (command) {
    case 'help':   showHelp(); break;
    case 'list':   
      const target = args[0] ? normalizePath(args[0]) : currentDir;
      listDir(target);
      break;
    case 'create': 
      if (args.length >= 2) createItem(args[0], args[1]);
      else console.error('Использование: create <type> <name>');
      break;
    case 'copy':   
      if (args.length >= 2) copyItem(args[0], args[1]);
      else console.error('Использование: copy <source> <destination>');
      break;
    case 'move':   
      if (args.length >= 2) moveItem(args[0], args[1]);
      else console.error('Использование: move <source> <destination>');
      break;
    case 'delete': 
      if (args.length >= 1) deleteItem(args[0]);
      else console.error('Использование: delete <path>');
      break;
    case 'cd':     
      if (args.length >= 1) changeDir(args[0]);
      else console.error('Использование: cd <path>');
      break;
    case 'exit':
      console.log('Завершение работы...');
      rl.close();
      process.exit(0);
      break;
    default:
      console.error(`Неизвестная команда: ${command}`);
  }
}

function showPrompt() {
  console.log(`\nТекущая директория: ${currentDir}`);
  rl.question('> ', (input) => {
    const cmdData = parseCommand(input);
    if (cmdData) executeCommand(cmdData);
    showPrompt();
  });
}

// запуськ
console.log('=== Текстовый файловый менеджер ===');

console.log(`
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⡄⠀⠀⠀⠀⢀⡴⠚⠉⠀⠀⠀⠈⠓⢤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣏⣿⠟⡄⠀⠀⣠⡟⣡⣄⡀⠀⠀⠀⠀⠀⠀⠑⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⢾⣦⣴⢋⡞⠋⠙⠻⣦⡀⠀⠀⠀⠀⢀⣼⡀⠀⠀⢠⣾⣿⡀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡿⢼⣧⣾⣽⡿⣿⣿⡤⣤⣴⣶⣿⠟⠻⠤⣶⡿⠿⠿⠃⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡟⠀⠀⠈⠛⠛⠒⡟⠁⠀⠀⠻⣿⣿⣱⢠⡞⠁⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠃⢠⣶⣤⣤⣾⣇⣶⣀⠀⠀⠀⠀⣍⠁⠀⠘⡄⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡾⡖⢺⠻⣧⣀⠀⠉⠛⠛⠿⠶⠚⠛⠙⢷⣤⡀⡇⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⠴⢶⣤⣤⣾⣿⡇⡅⠈⣧⣿⣎⢙⡒⠢⠤⢄⣀⣀⣀⣠⠤⢹⠀⣷⡄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⡠⠖⠀⠀⠀⠀⠻⣿⣿⣿⣷⡙⠶⣧⠀⠈⢧⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣦⣤⣤⣤⡀
⠀⠀⠀⠀⢀⡾⠁⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⣿⣦⣿⠀⠀⢸⣄⣀⠄⠀⠉⠠⣄⣰⠀⢀⣼⣿⣿⣿⠟⠃⠀⠉
⠀⠀⠀⠀⡼⠁⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣿⡿⠁⠀⠀⠈⠀⠀⠀⠀⠀⣤⠞⠋⣠⣿⣿⣿⣿⠋⠀⠀⠀⠀
⠀⠀⠀⢀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀
⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⠟⢋⡅⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢺⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀
⠀⠀⠀⡞⠀⠀⠀⠀⡠⠄⣀⠴⠛⠉⠁⠀⠀⢨⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣽⣿⣾⣿⣷⡄⠀⠀⠀⠀
⠀⠀⢸⠁⠀⡠⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⣿⣿⣿⠟⠀⠀⠀⠀
⠀⢀⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⠄⠈⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣴⠿⠿⠿⣿⣷⠤⠶⠦⣄⡀
⢠⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠄⠂⢹⡀⠀⠀⠀⠀⢀⣀⣠⠾⠟⠋⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉
⠸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢳⣤⡴⠾⠛⠋⢹⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⢻⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠓⠚⢸⣿⣦⡙⢣⠀⠀⠀⢸⡧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠈⠛⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠒⠛⠛⠛⠛⠓⠒⠒⠒⠚⠛⠒⠒⠂⠐⠂⠀⠀⠀⠀⠀⠀⠀⠀⠀
`);

console.log('Введите help для списка команд\n');
showPrompt();