// V7.cpp : This file contains the 'main' function. Program execution begins and ends there.
//

#include <iostream>
#include <Windows.h>
#include <conio.h>
#include <cmath>
using namespace std;
const float Pi = 3.14159;
int n,map[200][200];
string pixel(1,(char)219);
void SetText(int x, int y, string text = "", int color = 0) {
    if (x >= 0 && y >= 0) {
        COORD CurPos = { y,x };
        HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
        SetConsoleCursorPosition(h, CurPos);
        SetConsoleTextAttribute(h, color);
        cout << text;
    }
}
void Rectangle(int x_sus,int y_sus,int x_jos,int y_jos,char fill='\0',int color=0) {
    if (x_sus <= x_jos && y_sus <= y_jos) {
        string line="";
        for (int i = y_sus; i <= y_jos; i++)line += fill;
        for (int i = x_sus; i <= x_jos; i++)SetText(i, y_sus, line, color);
    }
    else return ;
}
void Line(int y1, int x1, int y2, int x2, string fill = "", int color = 0) {
    float a,b;
    y1 = -y1;y2 = -y2;
    if (abs(x1-x2)<abs(y1-y2)) {
        a = (float)(x1 - x2) / (y1 - y2);
        b = x1 - y1 * a;
        for (float i = min(y1, y2); i <= max(y1, y2); i ++)SetText(-i, round(a * i + b), fill, color);
    }
    else {
        a = (float)(y1 - y2) / (x1 - x2);
        b = y1 - a * x1;
        for (float i = min(x1, x2); i <= max(x1, x2); i ++)SetText(round(-(a * i + b)), i, fill, color);
    }
}
void Polygon(int cx,int cy, int r,int points_cnt ,string fill="",int color=0) {
    float angle =(float)2 * Pi / points_cnt;
    int points[204], cnt = 0;
    for (float i = 0; i <= 2 * Pi; i += angle) { cnt++; points[cnt] = sin(i) * r; cnt++; points[cnt] = cos(i) * r; }
    for (int i = 1; i <= cnt-2; i += 2)Line(cy+points[i], cx+points[i + 1], cy+points[i + 2], cx+points[i + 3], fill, color);
    Line(cy + points[1], cx + points[2], cy + points[cnt - 1],cx+points[cnt], fill, color);
}
void Circle(int x,int y,int r, string fill="",int color=0) {
    float angle = (float)1 / (r);
    for (float i = 0; i <= Pi/4; i += angle) {
        float xc = round(sin(i) * r), yc =round(cos(i) * r);
        SetText(x - xc, y + yc, fill, color);
        SetText(x + xc, y + yc, fill, color);
        SetText(x - xc, y - yc, fill, color);
        SetText(x + xc, y - yc, fill, color);
        SetText(x + yc, y - xc, fill, color);
        SetText(x - yc, y - xc, fill, color);
        SetText(x + yc, y + xc, fill, color);
        SetText(x - yc, y + xc, fill, color);
    }
}
float Dis(int x1, int y1, int x2, int y2) {
    return sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}
void Parabola(int y, int x1, int x2,int h,string fill="",int color=0) {
    float s = x1 + x2;
    if (x1 > x2)swap(x1, x2);
    float a =(float)4*h/((x1-x2)*(x1-x2));
    float b = -a * s;
    float c = y - a * x1 * x1 - b * x1;
    for (float i = x1; i <= x2; i++) {
        SetText(round(a*i*i+b*i+c),round(i), fill, color);
    }
}
int main()
{
    char c = 0, r = 0;
    int t = 1,cx,cy,color=2,points[100],cnt=1;
    string mode="draw";
    bool palet=false;
    cin >> n;
    Line(0, 0, 0, n, pixel, 15);
    Line(0, 0, n, 0, pixel, 15);
    Line(0, n, n, n, pixel, 15);
    Line(n, 0, n, n, pixel, 15);
    SetText(1, n + 4, "Line", 15);
    SetText(3, n + 4, "Circle", 15);
    SetText(5, n + 4, "Polygon", 15);
    int x = n / 2, y = n / 2;
    SetText(x, y);
    POINT p;
    while (t) {
        if (GetAsyncKeyState(VK_LBUTTON)) {
                GetCursorPos(&p);
                x = round(((double)p.y - 22) / 6.4); y = round(p.x / 6.4);
                if (x < 11 && x >= 1 && y < n && y >= n - 8 && palet) color = ((x - 1) - (x - 1) % 2) * 2 + (y - n + 9) / 2 + (y - n + 9) % 2;
                if ((x == 1 && y > n + 4 && y < n + 10) || mode == "line") {
                    if (mode != "line") {
                        mode = "line"; cnt = 1;
                        SetText(1, n + 4, "Line", 4);
                    }
                    else {
                        if (x != 1 || (y<n + 4 && y>n + 10)) {
                            if (cnt == 1)cx = x, cy = y, cnt = 0, SetText(cx, cy, pixel, color);
                            else if (cnt == 0 && (x != cx || y != cy)) {
                                Line(cx, cy, x, y, pixel, color);
                                cnt = 1; Sleep(100);
                            }
                        }
                        else if (cnt != 1) {
                            SetText(1, n + 4, "Line", 15);
                            mode = "draw"; cnt = 1;
                            SetText(cx, cy, " ");
                            Sleep(100);
                        }
                    }
                    Sleep(100);
                }else
                if ((x == 3 && y > n + 4 && y < n + 10) || mode == "circle") {
                    if (mode != "circle") {
                        mode = "circle"; 
                        SetText(3, n + 4, "Circle", 4);
                    }
                    else {
                        if (x != 3 || (y<n + 4 && y>n + 10)) {
                            if (cnt == 1)cx = x, cy = y, cnt = 0, SetText(cx, cy, pixel, color);
                            else if (cnt == 0 && (x != cx || y != cy)) {
                                Circle(cx, cy, Dis(cx, cy, x, y), pixel, color);
                                cnt = 1; Sleep(100);
                            }
                        }
                        else if (cnt != 1) {
                            SetText(3, n + 4, "Circle", 15);
                            mode = "draw"; cnt = 1;
                            SetText(cx, cy, " ");
                            Sleep(100);
                        }
                    }
                    Sleep(100);
                }else
                if (x == 5 && y > n + 4 && y < n + 10||mode=="polygon") {
                    Sleep(500);
                    if (mode != "polygon") {
                        mode = "polygon";
                        SetText(5, n + 4, "Polygon", 4);
                        cnt = 0;
                    }
                    else if (x == 5 && y > n + 4 && y < n + 10) {
                        mode = "draw";
                        SetText(5, n + 4, "Polygon", 15);
                        cnt = 1;
                    }
                    else {
                        cnt++;
                        points[cnt] = x; points[cnt + 1] = y; 
                        cnt++;
                        if (GetAsyncKeyState(VK_RETURN))
                            for (int i = 1; i < cnt; i += 2)Line(points[i], points[i + 1], points[i + 2], points[i + 3], pixel, color);
                    }
                }else
                if(mode=="draw")SetText(x, y, pixel, color);
        }
        if (_kbhit()) {
                c = _getch();
                if (c == 'w')x--;
                else if (c == 's')x++;
                else if (c == 'a')y--;
                else if (c == 'd')y++;
                else if (c == ' ') {
                    SetText(x, y, pixel, color);
                    c = _getch();
                    while (c == ' ') {
                        if (_kbhit()) {
                            r = _getch();
                            if (r == 'w' || r == 's' || r == 'd' || r == 'a') {
                                SetText(x, y, pixel, color);
                                if (r == 'w')x--;
                                else if (r == 's')x++;
                                else if (r == 'a')y--;
                                else if (r == 'd')y++;
                            }
                            else break;
                            SetText(x, y, pixel, color);
                        }

                    }
                }
                else if (c == char(8)) {
                    SetText(x, y, " ");
                    c = _getch();
                    while (c == 8)
                        if (_kbhit()) {
                            r = _getch();
                            if (r == 'w' || r == 's' || r == 'd' || r == 'a') {
                                SetText(x, y, " ");
                                if (r == 'w')x--;
                                else if (r == 's')x++;
                                else if (r == 'a')y--;
                                else if (r == 'd')y++;
                            }
                            else break;
                            SetText(x, y, " ");
                        }
                }
                else if (c == 'c') {
                    if (palet) {
                        if (x < 11 && x >= 1 && y < n && y >= n - 8)
                            color = ((x - 1) - (x - 1) % 2) * 2 + (y - n + 9) / 2 + (y - n + 9) % 2;
                        else {
                            palet = false;
                            Rectangle(1, n - 8, 8, n - 1, ' ');
                        }
                    }
                    else {
                        y = n - 8;
                        x = 1;
                        for (int i = 1; i <= 15; i++) {
                            palet = true;
                            SetText(x, y, pixel, i);
                            SetText(x + 1, y, pixel, i);
                            y++;
                            SetText(x, y, pixel, i);
                            SetText(x + 1, y, pixel, i);
                            y++;
                            if (i % 4 == 0)y = n - 8, x += 2;
                        }
                    }
                }
                else if (c == 'l') {
                    SetText(x, y, pixel, 2);
                    points[cnt] = x;
                    cnt++;
                    points[cnt] = y;
                    points[cnt + 1] = points[1];
                    points[cnt + 2] = points[2];
                    cnt++;
                    r = _getch();
                    if (r == 'l') {
                        for (int i = 1; i < cnt; i += 2) {
                            Line(points[i], points[i + 1], points[i + 2], points[i + 3], pixel, color);
                        }
                        cnt = 1;
                    }
                    else if (r == 'p') {
                        Circle(points[1], points[2], 5, pixel, color);
                        cnt = 1;
                    }
                }
                SetText(x, y);
        }
    }
}

// Run program: Ctrl + F5 or Debug > Start Without Debugging menu
// Debug program: F5 or Debug > Start Debugging menu

// Tips for Getting Started: 
//   1. Use the Solution Explorer window to add/manage files
//   2. Use the Team Explorer window to connect to source control
//   3. Use the Output window to see build output and other messages
//   4. Use the Error List window to view errors
//   5. Go to Project > Add New Item to create new code files, or Project > Add Existing Item to add existing code files to the project
//   6. In the future, to open this project again, go to File > Open > Project and select the .sln file
